import React, { useCallback, useEffect, useImperativeHandle, useMemo, forwardRef } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurStyle, Canvas, PaintStyle, Picture, PointMode, Skia, StrokeCap, TileMode, createPicture } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing, SharedValue, cancelAnimation, runOnJS, useAnimatedStyle, useDerivedValue, useFrameCallback, useSharedValue, withDecay, withTiming,
} from 'react-native-reanimated';
import { F } from '../theme';
import { ARM_COLORS, GalaxyModel } from './layout';

const CAM = 820;
const EASE = Easing.inOut(Easing.cubic);

type Cam = {
  yaw: SharedValue<number>; spin: SharedValue<number>; pitch: SharedValue<number>; zoom: SharedValue<number>;
  fx: SharedValue<number>; fy: SharedValue<number>; fz: SharedValue<number>;
};

/** Perspective projection shared by the canvas, labels and hit-testing. Returns [sx, sy, scale, depth]. */
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
  const cam: Cam = { yaw, spin, pitch, zoom, fx, fy, fz };

  useEffect(() => {
    intro.value = withTiming(1, { duration: 2200, easing: Easing.out(Easing.cubic) });
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
      fx.value = withTiming(0, { duration: 1200, easing: EASE });
      fy.value = withTiming(0, { duration: 1200, easing: EASE });
      fz.value = withTiming(0, { duration: 1200, easing: EASE });
      zoom.value = withTiming(1, { duration: 1300, easing: EASE });
      return;
    }
    const n = model.nodes[i];
    fx.value = withTiming(n.x, { duration: 1300, easing: EASE });
    fy.value = withTiming(n.y, { duration: 1300, easing: EASE });
    fz.value = withTiming(n.z, { duration: 1300, easing: EASE });
    zoom.value = withTiming(2.6, { duration: 1400, easing: EASE });
  }, [model]);

  useImperativeHandle(ref, () => ({
    focus: focusIndex,
    reset: () => {
      focusIndex(null);
      pitch.value = withTiming(1.02, { duration: 1200, easing: EASE });
    },
  }), [focusIndex]);

  // Flatten model into plain arrays the UI thread can read.
  const data = useMemo(() => ({
    nx: model.nodes.map((n) => n.x), ny: model.nodes.map((n) => n.y), nz: model.nodes.map((n) => n.z),
    ns: model.nodes.map((n) => n.size),
    nt: model.nodes.map((n) => (n.tradition === 'persian' ? 0 : n.tradition === 'classical' ? 1 : 2)),
    ea: model.edges.map((e) => e.a), eb: model.edges.map((e) => e.b), ei: model.edges.map((e) => (e.implicit ? 1 : 0)),
    dust: Array.from(model.dust), stars: Array.from(model.stars),
  }), [model]);
  const nodeData = useMemo(() => ({ nx: data.nx, ny: data.ny, nz: data.nz, ns: data.ns, nt: data.nt }), [data]);
  const satCount = satellites.length;

  const picture = useDerivedValue(() => {
    const yawV = yaw.value + spin.value;
    const pit = pitch.value;
    const zm = zoom.value * (0.55 + 0.45 * intro.value);
    const fxv = fx.value, fyv = fy.value, fzv = fz.value;
    const t = clock.value;
    const s = sel.value;
    const fl = filt.value;
    const { nx, ny, nz, ns, nt, ea, eb, ei, dust, stars } = data;

    return createPicture((canvas) => {
      const p = Skia.Paint();
      p.setColor(Skia.Color('#060608'));
      canvas.drawRect(Skia.XYWHRect(0, 0, W, H), p);

      // Nebula glows around the galactic core and along both arms
      const glow = (wx: number, wy: number, wz: number, radius: number, color: string, alpha: number) => {
        const q = project(wx, wy, wz, yawV, pit, zm, fxv, fyv, fzv, W, H, focal);
        if (q[3] < 0) return;
        const r = radius * q[2];
        const g = Skia.Paint();
        g.setShader(Skia.Shader.MakeRadialGradient(Skia.Point(q[0], q[1]), Math.max(8, r), [Skia.Color(color), Skia.Color('rgba(0,0,0,0)')], null, TileMode.Clamp));
        g.setAlphaf(alpha);
        canvas.drawCircle(q[0], q[1], Math.max(8, r), g);
      };
      glow(0, 0, 0, 260, '#E9DFCF', 0.22);
      glow(170, 0, 120, 300, ARM_COLORS[0], fl === 2 ? 0.05 : 0.16);
      glow(-170, 0, -120, 300, ARM_COLORS[1], fl === 1 ? 0.05 : 0.16);
      glow(0, 0, 0, 70, '#FFF6E6', 0.35);

      // Distant stars (parallax: only rotation, reduced translation)
      const starPts: any[] = [];
      const starPtsDim: any[] = [];
      for (let i = 0; i < stars.length; i += 4) {
        const q = project(stars[i], stars[i + 1], stars[i + 2], yawV * 0.6, pit * 0.8, 1, fxv * 0.1, fyv * 0.1, fzv * 0.1, W, H, focal * 0.9);
        if (q[3] < 0 || q[0] < -10 || q[0] > W + 10 || q[1] < -10 || q[1] > H + 10) continue;
        const tw = stars[i + 3] * (0.75 + 0.25 * Math.sin(t * 1.3 + i));
        (tw > 0.55 ? starPts : starPtsDim).push(Skia.Point(q[0], q[1]));
      }
      const sp = Skia.Paint();
      sp.setStrokeCap(StrokeCap.Round);
      sp.setColor(Skia.Color('#FFFFFF'));
      sp.setStrokeWidth(1.6);
      sp.setAlphaf(0.55);
      canvas.drawPoints(PointMode.Points, starPts, sp);
      sp.setStrokeWidth(1.1);
      sp.setAlphaf(0.25);
      canvas.drawPoints(PointMode.Points, starPtsDim, sp);

      // Spiral dust, three depth bins per arm colour
      const bins: any[][] = [[], [], [], [], [], [], [], [], []];
      for (let i = 0; i < dust.length; i += 4) {
        const q = project(dust[i], dust[i + 1], dust[i + 2], yawV, pit, zm, fxv, fyv, fzv, W, H, focal);
        if (q[3] < 0 || q[0] < -20 || q[0] > W + 20 || q[1] < -20 || q[1] > H + 20) continue;
        const arm = dust[i + 3];
        const b = q[2] > 1.9 ? 2 : q[2] > 1.2 ? 1 : 0;
        bins[arm * 3 + b].push(Skia.Point(q[0], q[1]));
      }
      const dp = Skia.Paint();
      dp.setStrokeCap(StrokeCap.Round);
      for (let arm = 0; arm < 3; arm++) {
        const dim = (fl === 1 && arm === 1) || (fl === 2 && arm === 0) ? 0.25 : 1;
        dp.setColor(Skia.Color(ARM_COLORS[arm]));
        for (let b = 0; b < 3; b++) {
          dp.setStrokeWidth(1.2 + b * 0.9);
          dp.setAlphaf((0.22 + b * 0.16) * dim * intro.value);
          canvas.drawPoints(PointMode.Points, bins[arm * 3 + b], dp);
        }
      }

      // Project nodes
      const n = nx.length;
      const px = new Array(n), py = new Array(n), ps = new Array(n), pd = new Array(n);
      for (let i = 0; i < n; i++) {
        const q = project(nx[i], ny[i], nz[i], yawV, pit, zm, fxv, fyv, fzv, W, H, focal);
        px[i] = q[0]; py[i] = q[1]; ps[i] = q[2]; pd[i] = q[3];
      }
      const dimmed = (i: number) => (fl === 1 && nt[i] !== 0) || (fl === 2 && nt[i] !== 1);

      // Constellation lines
      const lp = Skia.Paint();
      lp.setStyle(PaintStyle.Stroke);
      lp.setStrokeCap(StrokeCap.Round);
      for (let k = 0; k < ea.length; k++) {
        const a = ea[k], b = eb[k];
        if (pd[a] < 0 || pd[b] < 0) continue;
        const hot = s >= 0 && (a === s || b === s);
        const faint = dimmed(a) && dimmed(b);
        lp.setColor(Skia.Color(hot ? '#F3EADB' : ARM_COLORS[nt[a]]));
        lp.setStrokeWidth(hot ? 1.4 : ei[k] ? 0.5 : 0.8);
        lp.setAlphaf((hot ? 0.75 : s >= 0 ? 0.08 : ei[k] ? 0.12 : 0.22) * (faint ? 0.3 : 1) * intro.value);
        canvas.drawLine(px[a], py[a], px[b], py[b], lp);
        if (hot) {
          // light pulses travelling along the link
          const pp = Skia.Paint();
          pp.setColor(Skia.Color('#FFF7EA'));
          pp.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 3, true));
          for (let m = 0; m < 2; m++) {
            const u = (t * 0.32 + m * 0.5 + k * 0.13) % 1;
            const from = a === s ? a : b, to = a === s ? b : a;
            canvas.drawCircle(px[from] + (px[to] - px[from]) * u, py[from] + (py[to] - py[from]) * u, 2.4, pp);
          }
        }
      }

      // Stars (artists), far to near
      const order = Array.from({ length: n }, (_, i) => i).sort((i, j) => pd[j] - pd[i]);
      const gp = Skia.Paint();
      const cp = Skia.Paint();
      for (let o = 0; o < order.length; o++) {
        const i = order[o];
        if (pd[i] < 0) continue;
        const r = ns[i] * ps[i] * (0.4 + 0.6 * intro.value);
        if (px[i] < -r * 4 || px[i] > W + r * 4 || py[i] < -r * 4 || py[i] > H + r * 4) continue;
        const isSel = i === s;
        const dimK = dimmed(i) ? 0.25 : s >= 0 && !isSel ? 0.7 : 1;
        const twinkle = 0.85 + 0.15 * Math.sin(t * 2 + i * 1.7);
        const col = Skia.Color(ARM_COLORS[nt[i]]);
        gp.setColor(col);
        gp.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, Math.max(2, r * 1.3), true));
        gp.setAlphaf(0.45 * dimK * twinkle);
        canvas.drawCircle(px[i], py[i], r * 2.2, gp);
        cp.setColor(col);
        cp.setAlphaf(0.95 * dimK);
        canvas.drawCircle(px[i], py[i], r, cp);
        cp.setColor(Skia.Color('#FFFDF8'));
        cp.setAlphaf(0.9 * dimK);
        canvas.drawCircle(px[i], py[i], Math.max(0.8, r * 0.38), cp);
        if (isSel) {
          const rp = Skia.Paint();
          rp.setStyle(PaintStyle.Stroke);
          rp.setColor(Skia.Color('#F3EADB'));
          rp.setStrokeWidth(1);
          const pulse = (t * 0.6) % 1;
          rp.setAlphaf(0.6 * (1 - pulse));
          canvas.drawCircle(px[i], py[i], r * (1.8 + pulse * 3.5), rp);
          rp.setAlphaf(0.35);
          canvas.drawCircle(px[i], py[i], r * 1.7, rp);
        }
      }

      // Works orbiting the selected artist
      if (s >= 0 && satCount > 0 && pd[s] >= 0) {
        const op = Skia.Paint();
        op.setStyle(PaintStyle.Stroke);
        op.setStrokeWidth(0.7);
        op.setColor(Skia.Color('#E9DFCF'));
        const sp2 = Skia.Paint();
        sp2.setColor(Skia.Color('#F6EFE4'));
        for (let k = 0; k < Math.min(satCount, 8); k++) {
          const R = ns[s] * 2.4 + 10 + k * 7;
          const path = Skia.Path.Make();
          for (let a = 0; a <= 48; a++) {
            const th = (a / 48) * Math.PI * 2;
            const q = project(nx[s] + Math.cos(th) * R, ny[s], nz[s] + Math.sin(th) * R, yawV, pit, zm, fxv, fyv, fzv, W, H, focal);
            if (a === 0) path.moveTo(q[0], q[1]); else path.lineTo(q[0], q[1]);
          }
          op.setAlphaf(0.16);
          canvas.drawPath(path, op);
          const th = t * (0.55 - k * 0.04) + k * 2.1;
          const q = project(nx[s] + Math.cos(th) * R, ny[s], nz[s] + Math.sin(th) * R, yawV, pit, zm, fxv, fyv, fzv, W, H, focal);
          sp2.setMaskFilter(Skia.MaskFilter.MakeBlur(BlurStyle.Normal, 2, true));
          sp2.setAlphaf(0.9);
          canvas.drawCircle(q[0], q[1], Math.max(1.6, 1.3 * q[2]), sp2);
        }
      }
    }, Skia.XYWHRect(0, 0, W, H));
  }, [data, W, H, satCount]);

  // Gestures
  const pan = Gesture.Pan()
    .onBegin(() => {
      touching.value = 1;
      cancelAnimation(yaw);
    })
    .onChange((e) => {
      yaw.value -= e.changeX * 0.0055;
      pitch.value = Math.min(1.5, Math.max(0.12, pitch.value - e.changeY * 0.004));
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
      zoom.value = Math.min(5, Math.max(0.45, zoom.value * e.scaleChange));
    })
    .onFinalize(() => { touching.value = 0; });

  const hitTest = (x: number, y: number) => {
    'worklet';
    const yawV = yaw.value + spin.value;
    let best = -1;
    let bestD = 1e9;
    const nd = nodeData;
    for (let i = 0; i < nd.nx.length; i++) {
      const q = project(nd.nx[i], nd.ny[i], nd.nz[i], yawV, pitch.value, zoom.value, fx.value, fy.value, fz.value, W, H, focal);
      if (q[3] < 0) continue;
      const d = Math.hypot(q[0] - x, q[1] - y);
      const lim = Math.max(24, nd.ns[i] * q[2] * 2.2);
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

  return (
    <GestureDetector gesture={gesture}>
      <View style={StyleSheet.absoluteFill} collapsable={false}>
        <Canvas style={StyleSheet.absoluteFill}>
          <Picture picture={picture} />
        </Canvas>
        {labelSet.map((i) =>
          model.nodes[i] ? (
            <StarLabel key={model.nodes[i].id} i={i} name={model.nodes[i].name} data={nodeData} cam={cam} sel={sel} filt={filt} W={W} H={H} focal={focal} />
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

function StarLabel({ i, name, data, cam, sel, filt, W, H, focal }: any) {
  const style = useAnimatedStyle(() => {
    const q = project(data.nx[i], data.ny[i], data.nz[i], cam.yaw.value + cam.spin.value, cam.pitch.value, cam.zoom.value, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (q[3] < 0) return { opacity: 0, transform: [{ translateX: -999 }, { translateY: -999 }] };
    const isSel = sel.value === i;
    const dim = (filt.value === 1 && data.nt[i] !== 0) || (filt.value === 2 && data.nt[i] !== 1);
    const near = Math.min(1, Math.max(0, (q[2] - 0.55) * 1.6));
    const op = isSel ? 1 : (sel.value >= 0 ? 0.55 : 0.85) * near * (dim ? 0.2 : 1);
    const r = data.ns[i] * q[2];
    return {
      opacity: op,
      transform: [{ translateX: q[0] - 80 }, { translateY: q[1] + r + 6 }, { scale: isSel ? 1.15 : 0.9 + near * 0.15 }],
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
    const R = data.ns[s] * 2.4 + 10 + k * 7;
    const th = clock.value * (0.55 - k * 0.04) + k * 2.1;
    const q = project(data.nx[s] + Math.cos(th) * R, data.ny[s], data.nz[s] + Math.sin(th) * R, cam.yaw.value + cam.spin.value, cam.pitch.value, cam.zoom.value, cam.fx.value, cam.fy.value, cam.fz.value, W, H, focal);
    if (q[3] < 0) return { opacity: 0 };
    return { opacity: Math.min(0.85, Math.max(0, (cam.zoom.value - 1.4) * 0.8)), transform: [{ translateX: q[0] - 70 }, { translateY: q[1] - 22 }] };
  });
  return (
    <Animated.Text pointerEvents="none" numberOfLines={1} style={[styles.sat, style]}>
      {title}
    </Animated.Text>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute', left: 0, top: 0, width: 160, textAlign: 'center',
    color: '#EFE9DF', fontFamily: F.regular, fontSize: 11.5,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 6,
  },
  sat: {
    position: 'absolute', left: 0, top: 0, width: 140, textAlign: 'center',
    color: '#D9CFBF', fontFamily: F.light, fontSize: 10,
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 5,
  },
});
