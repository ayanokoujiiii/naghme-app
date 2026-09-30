import React, { useCallback, useEffect, useImperativeHandle, useMemo, forwardRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, SharedValue, cancelAnimation, runOnJS, useAnimatedStyle, useFrameCallback, useSharedValue, withDecay, withTiming,
} from 'react-native-reanimated';
import { F } from '../theme';
import { ARM_COLORS, GalaxyModel } from './layout';

/**
 * The galaxy of artists.
 * v1.1: rebuilt without a drawing canvas (the old one crashed on Android).
 *  - the spiral disc (dust + nebula glow) is drawn ONCE as SVG, then tilted and
 *    turned by native 3D transforms that follow exactly the same camera maths
 *    as the stars, so the GPU does all the moving;
 *  - every artist, link and label is a small native view positioned on the UI
 *    thread each frame.
 */
const CAM = 820;
const EASE = Easing.inOut(Easing.cubic);
const DISC_R = 430; // world units covered by the dust disc
const NODE_BASE = 40; // base pixel size of a star view (scaled per star)

type Cam = {
  yaw: SharedValue<number>; spin: SharedValue<number>; pitch: SharedValue<number>; zoom: SharedValue<number>;
  fx: SharedValue<number>; fy: SharedValue<number>; fz: SharedValue<number>; intro: SharedValue<number>;
};

/** Perspective projection shared by stars, links, labels and hit-testing. Returns [sx, sy, scale, depth]. */
function project(x: number, y: number, z: number, yaw: number, pitch: number, zoom: number, fx: number, fy: number, fz: number, W: number, H: number, focal: number): number[] {
  'worklet';
  const dx = x - fx, dy = y - fy, dz = z - fz;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const x1 = dx * cy - dz * sy;
  const z1 = dx * sy + dz * cy;
  const cp = Math.cos(pitch), sp = Math.sin(pitch);
  const y1 = dy * cp - z1 * sp;
  const z2 = dy * sp + z1 * cp;
  const depth = z2 + CAM / zoom;
  if (depth < 30) return [0, 0, 0, -1];
  const s = focal / depth;
  return [W / 2 + x1 * s, H * 0.47 + y1 * s, s, depth];
}

function camZoom(c: Cam) {
  'worklet';
  return c.zoom.value * (0.55 + 0.45 * c.intro.value);
}

export interface GalaxyHandle { focus: (index: number | null) => void; reset: () => void }

interface Props {
  model: GalaxyModel;
  selected: number | null;
  filter: 0 | 1 | 2; // 0 all, 1 persian, 2 classical
  satellites: string[];
  labelSet: number[];
  onSelect: (index: number | null) => void;
  active: boolean;
}

/** Many tiny circles merged into one SVG path per colour bin: a single draw call. */
function dotsPath(pts: number[][], r: number): string {
  let d = '';
  for (const [x, y] of pts) d += `M${(x - r).toFixed(1)} ${y.toFixed(1)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
  return d;
}

export const GalaxyView = forwardRef<GalaxyHandle, Props>(function GalaxyView({ model, selected, filter, satellites, labelSet, onSelect, active }, ref) {
  const { width: W, height: H } = useWindowDimensions();
  const focal = W * 1.15;

  const yaw = useSharedValue(0.6);
  const spin = useSharedValue(0);
  const pitch = useSharedValue(1.02);
  const zoom = useSharedValue(1);
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);
  const fz = useSharedValue(0);
  const clock = useSharedValue(0);
  const touching = useSharedValue(0);
  const sel = useSharedValue(-1);
  const filt = useSharedValue(0);
  const intro = useSharedValue(0);
  const cam: Cam = { yaw, spin, pitch, zoom, fx, fy, fz, intro };

  useEffect(() => {
    intro.value = withTiming(1, { duration: 2000, easing: Easing.out(Easing.cubic) });
  }, []);
  useEffect(() => { sel.value = selected ?? -1; }, [selected]);
  useEffect(() => { filt.value = filter; }, [filter]);

  const frame = useFrameCallback((f) => {
    clock.value = f.timeSinceFirstFrame / 1000;
    if (!touching.value && sel.value < 0) spin.value += (f.timeSincePreviousFrame ?? 16) * 0.000045;
  }, true);
  useEffect(() => { frame.setActive(active); }, [active]);

  const focusIndex = useCallback((i: number | null) => {
    if (i === null || !model.nodes[i]) {
      fx.value = withTiming(0, { duration: 1100, easing: EASE });
      fy.value = withTiming(0, { duration: 1100, easing: EASE });
      fz.value = withTiming(0, { duration: 1100, easing: EASE });
      zoom.value = withTiming(1, { duration: 1200, easing: EASE });
      return;
    }
    const n = model.nodes[i];
    fx.value = withTiming(n.x, { duration: 1200, easing: EASE });
    fy.value = withTiming(n.y, { duration: 1200, easing: EASE });
    fz.value = withTiming(n.z, { duration: 1200, easing: EASE });
    zoom.value = withTiming(2.4, { duration: 1300, easing: EASE });
  }, [model]);

  useImperativeHandle(ref, () => ({
    focus: focusIndex,
    reset: () => {
      focusIndex(null);
      pitch.value = withTiming(1.02, { duration: 1100, easing: EASE });
    },
  }), [focusIndex]);

  const nodeData = useMemo(() => ({
    nx: model.nodes.map((n) => n.x), ny: model.nodes.map((n) => n.y), nz: model.nodes.map((n) => n.z),
    ns: model.nodes.map((n) => n.size),
    nt: model.nodes.map((n) => (n.tradition === 'persian' ? 0 : n.tradition === 'classical' ? 1 : 2)),
  }), [model]);

  // ---- The disc: drawn once in world units (x → right, z → up) ----
  const D = DISC_R * 2;
  const disc = useMemo(() => {
    const bins: number[][][] = [[], [], [], [], [], []];
    const d = model.dust;
    for (let i = 0; i < d.length; i += 4) {
      const arm = d[i + 3];
      const big = i % 12 === 0 ? 1 : 0;
      bins[arm * 2 + big].push([DISC_R + d[i], DISC_R - d[i + 2]]);
    }
    return bins.map((pts, k) => ({ d: dotsPath(pts, k % 2 ? 2.4 : 1.4), color: ARM_COLORS[Math.floor(k / 2)], big: k % 2 === 1, arm: Math.floor(k / 2) }));
  }, [model]);

  const stars = useMemo(() => {
    const pts: number[][] = [];
    const dim: number[][] = [];
    let s = 7;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 240; i++) (rnd() > 0.6 ? pts : dim).push([rnd() * W, rnd() * H]);
    return { bright: dotsPath(pts, 1.1), dim: dotsPath(dim, 0.7) };
  }, [W, H]);

  const discStyle = useAnimatedStyle(() => {
    const zm = camZoom(cam);
    const s0 = (focal * zm) / CAM;
    // fade the dust when we fly close to a star, so perspective never inverts
    const op = Math.max(0.2, Math.min(1, 1.35 - (zoom.value - 1) * 0.55)) * intro.value;
    return {
      opacity: op,
      transform: [
        { perspective: focal },
        { rotateX: `${Math.PI / 2 - pitch.value}rad` },
        { rotateZ: `${-(yaw.value + spin.value)}rad` },
        { scale: s0 },
        { translateX: -fx.value },
        { translateY: fz.value },
      ],
    };
  });

  const starsStyle = useAnimatedStyle(() => ({
    opacity: 0.75 + 0.25 * Math.sin(clock.value * 0.7),
    transform: [{ rotate: `${-(yaw.value + spin.value) * 0.08}rad` }, { scale: 1.2 }],
  }));

  // ---- Gestures ----
  const pan = Gesture.Pan()
    .onBegin(() => {
      touching.value = 1;
      cancelAnimation(yaw);
    })
    .onChange((e) => {
      yaw.value -= e.changeX * 0.0055;
      pitch.value = Math.min(1.5, Math.max(0.15, pitch.value - e.changeY * 0.004));
    })
    .onEnd((e) => {
      yaw.value = withDecay({ velocity: -e.velocityX * 0.0055, deceleration: 0.994 });
    })
    .onFinalize(() => {
      touching.value = 0;
    });
  const pinch = Gesture.Pinch()
    .onBegin(() => { touching.value = 1; })
    .onChange((e) => {
      zoom.value = Math.min(4, Math.max(0.5, zoom.value * e.scaleChange));
    })
    .onFinalize(() => { touching.value = 0; });

  const hitTest = (x: number, y: number) => {
    'worklet';
    const yawV = yaw.value + spin.value;
    const zm = camZoom(cam);
    let best = -1;
    let bestD = 1e9;
    const nd = nodeData;
    for (let i = 0; i < nd.nx.length; i++) {
      const q = project(nd.nx[i], nd.ny[i], nd.nz[i], yawV, pitch.value, zm, fx.value, fy.value, fz.value, W, H, focal);
      if (q[3] < 0) continue;
      const d = Math.hypot(q[0] - x, q[1] - y);
      const lim = Math.max(26, nd.ns[i] * q[2] * 2.4);
      if (d < lim && d < bestD) { bestD = d; best = i; }
    }
    return best;
  };
  const single = Gesture.Tap().maxDuration(260).onEnd((e) => {
    const i = hitTest(e.x, e.y);
    runOnJS(onSelect)(i >= 0 ? i : null);
  });
  const double = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    runOnJS(onSelect)(null);
  });
  const gesture = Gesture.Simultaneous(pan, pinch, Gesture.Exclusive(double, single));

  const dimmedJS = (i: number) => (filter === 1 && nodeData.nt[i] !== 0) || (filter === 2 && nodeData.nt[i] !== 1);

  return (
    <GestureDetector gesture={gesture}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: '#050507', overflow: 'hidden' }]} collapsable={false}>
        {/* distant stars */}
        <Animated.View style={[StyleSheet.absoluteFill, starsStyle]} pointerEvents="none" renderToHardwareTextureAndroid>
          <Svg width={W} height={H}>
            <Path d={stars.dim} fill="#FFFFFF" fillOpacity={0.35} />
            <Path d={stars.bright} fill="#FFFFFF" fillOpacity={0.8} />
          </Svg>
        </Animated.View>

        {/* the spiral disc */}
        <Animated.View
          pointerEvents="none"
          renderToHardwareTextureAndroid
          style={[{ position: 'absolute', width: D, height: D, left: W / 2 - D / 2, top: H * 0.47 - D / 2 }, discStyle]}
        >
          <Svg width={D} height={D}>
            <Defs>
              <RadialGradient id="gcore" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor="#FFF6E6" stopOpacity={0.75} />
                <Stop offset="0.3" stopColor="#E9DFCF" stopOpacity={0.3} />
                <Stop offset="1" stopColor="#E9DFCF" stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="garm0" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={ARM_COLORS[0]} stopOpacity={0.32} />
                <Stop offset="1" stopColor={ARM_COLORS[0]} stopOpacity={0} />
              </RadialGradient>
              <RadialGradient id="garm1" cx="50%" cy="50%" r="50%">
                <Stop offset="0" stopColor={ARM_COLORS[1]} stopOpacity={0.32} />
                <Stop offset="1" stopColor={ARM_COLORS[1]} stopOpacity={0} />
              </RadialGradient>
            </Defs>
            <Circle cx={DISC_R + 170} cy={DISC_R - 120} r={300} fill="url(#garm0)" opacity={filter === 2 ? 0.3 : 1} />
            <Circle cx={DISC_R - 170} cy={DISC_R + 120} r={300} fill="url(#garm1)" opacity={filter === 1 ? 0.3 : 1} />
            <Circle cx={DISC_R} cy={DISC_R} r={260} fill="url(#gcore)" />
            {disc.map((b, k) => {
              const dim = (filter === 1 && b.arm === 1) || (filter === 2 && b.arm === 0) ? 0.25 : 1;
              return <Path key={k} d={b.d} fill={b.color} fillOpacity={(b.big ? 0.75 : 0.5) * dim} />;
            })}
          </Svg>
        </Animated.View>

        {/* constellation lines */}
        {model.edges.map((e, k) => {
          const hot = selected !== null && (e.a === selected || e.b === selected);
          const faint = dimmedJS(e.a) && dimmedJS(e.b);
          const alpha = (hot ? 0.85 : selected !== null ? 0.1 : e.implicit ? 0.2 : 0.38) * (faint ? 0.3 : 1);
          return (
            <Edge key={`e${k}`} a={e.a} b={e.b} data={nodeData} cam={cam} W={W} H={H} focal={focal}
              color={hot ? '#F6EBD6' : ARM_COLORS[nodeData.nt[e.a]]} alpha={alpha} thick={hot ? 1.6 : e.implicit ? 0.7 : 1} />
          );
        })}

        {/* artists */}
        {model.nodes.map((n, i) => (
          <StarNode key={n.id} i={i} data={nodeData} cam={cam} W={W} H={H} focal={focal}
            color={ARM_COLORS[nodeData.nt[i]]} dim={dimmedJS(i) ? 0.25 : selected !== null && selected !== i ? 0.65 : 1}
            selected={selected === i} clock={clock} />
        ))}

        {labelSet.map((i) =>
          model.nodes[i] ? (
            <StarLabel key={`l${model.nodes[i].id}`} i={i} name={model.nodes[i].name} data={nodeData} cam={cam} sel={sel} filt={filt} W={W} H={H} focal={focal} />
          ) : null,
        )}
        {selected !== null
          ? satellites.slice(0, 8).map((title, k) => (
              <SatLabel key={`${selected}-${k}`} k={k} title={title} s={selected} data={nodeData} cam={cam} clock={clock} W={W} H={H} focal={focal} />
            ))
          : null}
      </View>
    </GestureDetector>
  );
});

function StarNode({ i, data, cam, W, H, focal, color, dim, selected, clock }: any) {
  const style = useAnimatedStyle(() => {
    const zm = camZoom(cam);
    const q = project(data.nx[i], data.ny[i], data.nz[i], cam.yaw.value + cam.spin.value, cam.pitch.value, zm, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (q[3] < 0) return { opacity: 0, transform: [{ translateX: -999 }, { translateY: -999 }] };
    const r = data.ns[i] * q[2] * (0.4 + 0.6 * cam.intro.value);
    const k = Math.max(0.12, (r * 4.4) / NODE_BASE);
    const tw = 0.85 + 0.15 * Math.sin(clock.value * 2 + i * 1.7);
    return {
      opacity: dim * tw,
      transform: [{ translateX: q[0] - NODE_BASE / 2 }, { translateY: q[1] - NODE_BASE / 2 }, { scale: k }],
    };
  });
  const ring = useAnimatedStyle(() => {
    const p = (clock.value * 0.6) % 1;
    return { opacity: selected ? 0.7 * (1 - p) : 0, transform: [{ scale: 0.8 + p * 1.2 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.node, style]}>
      <View style={[styles.halo, { backgroundColor: color }]} />
      <View style={[styles.halo2, { backgroundColor: color }]} />
      <View style={[styles.core, { backgroundColor: color }]} />
      <View style={styles.heart} />
      <Animated.View style={[styles.ring, ring]} />
    </Animated.View>
  );
}

function Edge({ a, b, data, cam, W, H, focal, color, alpha, thick }: any) {
  const style = useAnimatedStyle(() => {
    const zm = camZoom(cam);
    const yawV = cam.yaw.value + cam.spin.value;
    const p = project(data.nx[a], data.ny[a], data.nz[a], yawV, cam.pitch.value, zm, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    const q = project(data.nx[b], data.ny[b], data.nz[b], yawV, cam.pitch.value, zm, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (p[3] < 0 || q[3] < 0) return { opacity: 0 };
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const len = Math.max(0.5, Math.hypot(dx, dy));
    return {
      opacity: alpha * cam.intro.value,
      transform: [
        { translateX: (p[0] + q[0]) / 2 - 0.5 },
        { translateY: (p[1] + q[1]) / 2 - thick / 2 },
        { rotate: `${Math.atan2(dy, dx)}rad` },
        { scaleX: len },
      ],
    };
  }, [alpha, thick]);
  return <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, top: 0, width: 1, height: thick, backgroundColor: color }, style]} />;
}

function StarLabel({ i, name, data, cam, sel, filt, W, H, focal }: any) {
  const style = useAnimatedStyle(() => {
    const zm = camZoom(cam);
    const q = project(data.nx[i], data.ny[i], data.nz[i], cam.yaw.value + cam.spin.value, cam.pitch.value, zm, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (q[3] < 0) return { opacity: 0, transform: [{ translateX: -999 }, { translateY: -999 }] };
    const isSel = sel.value === i;
    const dim = (filt.value === 1 && data.nt[i] !== 0) || (filt.value === 2 && data.nt[i] !== 1);
    const near = Math.min(1, Math.max(0, (q[2] - 0.5) * 1.6));
    const op = isSel ? 1 : (sel.value >= 0 ? 0.6 : 0.92) * near * (dim ? 0.2 : 1) * cam.intro.value;
    const r = data.ns[i] * q[2];
    return {
      opacity: op,
      transform: [{ translateX: q[0] - 80 }, { translateY: q[1] + r + 6 }, { scale: isSel ? 1.15 : 0.92 + near * 0.15 }],
    };
  });
  return (
    <Animated.Text pointerEvents="none" numberOfLines={1} style={[styles.label, style]}>
      {name}
    </Animated.Text>
  );
}

function SatLabel({ k, title, s, data, cam, clock, W, H, focal }: any) {
  const style = useAnimatedStyle(() => {
    const zm = camZoom(cam);
    const R = data.ns[s] * 2.4 + 10 + k * 7;
    const th = clock.value * (0.55 - k * 0.04) + k * 2.1;
    const q = project(data.nx[s] + Math.cos(th) * R, data.ny[s], data.nz[s] + Math.sin(th) * R, cam.yaw.value + cam.spin.value, cam.pitch.value, zm, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (q[3] < 0) return { opacity: 0 };
    return { opacity: Math.min(0.9, Math.max(0, (cam.zoom.value - 1.4) * 0.8)), transform: [{ translateX: q[0] - 70 }, { translateY: q[1] - 3 }] };
  });
  return (
    <Animated.View pointerEvents="none" style={[styles.satWrap, style]}>
      <View style={styles.satDot} />
      <Animated.Text numberOfLines={1} style={styles.sat}>{title}</Animated.Text>
    </Animated.View>
  );
}

const B = NODE_BASE;
const styles = StyleSheet.create({
  node: { position: 'absolute', left: 0, top: 0, width: B, height: B, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: B, height: B, borderRadius: B / 2, opacity: 0.16 },
  halo2: { position: 'absolute', width: B * 0.62, height: B * 0.62, borderRadius: B * 0.31, opacity: 0.32 },
  core: { position: 'absolute', width: B * 0.46, height: B * 0.46, borderRadius: B * 0.23, opacity: 0.98 },
  heart: { position: 'absolute', width: B * 0.18, height: B * 0.18, borderRadius: B * 0.09, backgroundColor: '#FFFDF8' },
  ring: { position: 'absolute', width: B * 0.9, height: B * 0.9, borderRadius: B * 0.45, borderWidth: 1.5, borderColor: '#F6EBD6' },
  label: {
    position: 'absolute', left: 0, top: 0, width: 160, textAlign: 'center',
    color: '#F4EEE3', fontFamily: F.medium, fontSize: 12.5,
    textShadowColor: 'rgba(0,0,0,0.95)', textShadowRadius: 6,
  },
  satWrap: { position: 'absolute', left: 0, top: 0, width: 140, alignItems: 'center' },
  satDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#F6EFE4', marginBottom: 2 },
  sat: {
    width: 140, textAlign: 'center',
    color: '#E4DACA', fontFamily: F.regular, fontSize: 11,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 5,
  },
});
