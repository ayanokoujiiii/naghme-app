import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { C } from '../theme';
import { useStretch } from '../mood';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { Rosette } from '../motifs/Ornament';

/**
 * Custom entering animation: content unfolds towards the viewer like a page
 * being laid flat, instead of a plain fade.
 */
export function unfold(delay = 0, duration = 420) {
  // v1.1: lighter and quicker (no per-item 3D perspective).
  return () => {
    'worklet';
    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
    const d = Math.min(duration, 520);
    const dl = Math.min(delay, 260);
    return {
      initialValues: { opacity: 0, transform: [{ translateY: 18 }] },
      animations: {
        opacity: withDelay(dl, withTiming(1, { duration: d * 0.8 })),
        transform: [{ translateY: withDelay(dl, withTiming(0, { duration: d, easing: ease })) }],
      },
    };
  };
}

/**
 * «پرده»: a heavy velvet curtain with real folds, a gold termeh border and a
 * lace hem. The two panels gather towards the sides like fabric being drawn:
 * the folds bunch together, the cloth ripples as it moves and sways once when
 * it stops. (v1.1: replaces the flat lace panel.)
 */
let curtainSeq = 0;
function CurtainCloth({ w, h, side, tint }: { w: number; h: number; side: 'l' | 'r'; tint: string }) {
  const id = React.useRef(`cur${++curtainSeq}`).current;
  const folds = 9;
  // folds are not all the same width, like real cloth
  const widths = React.useMemo(() => {
    const raw = Array.from({ length: folds }, (_, i) => 0.75 + 0.5 * Math.abs(Math.sin(i * 1.7 + (side === 'l' ? 0.3 : 1.1))));
    const sum = raw.reduce((x, y) => x + y, 0);
    return raw.map((r) => (r / sum) * w);
  }, [w, side]);
  let x = 0;
  const hem = `M0 ${h - 34} ${Array.from({ length: 12 }, (_, i) => {
    const x0 = (i / 12) * w, x1 = ((i + 0.5) / 12) * w, x2 = ((i + 1) / 12) * w;
    return `Q${x1.toFixed(1)} ${h - 18} ${x2.toFixed(1)} ${h - 34}`;
  }).join(' ')} V${h} H0 Z`;
  return (
    <Svg width={w} height={h}>
      <Defs>
        <LinearGradient id={`${id}f`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#140606" />
          <Stop offset="0.28" stopColor="#4A1616" />
          <Stop offset="0.5" stopColor="#7A2B22" />
          <Stop offset="0.72" stopColor="#4A1616" />
          <Stop offset="1" stopColor="#140606" />
        </LinearGradient>
        <LinearGradient id={`${id}v`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.55} />
          <Stop offset="0.25" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.85" stopColor="#000" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.5} />
        </LinearGradient>
        <LinearGradient id={`${id}g`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#8C5A22" />
          <Stop offset="0.5" stopColor={tint} />
          <Stop offset="1" stopColor="#8C5A22" />
        </LinearGradient>
      </Defs>
      {widths.map((fw, i) => {
        const r = <Rect key={i} x={x - 0.5} y={0} width={fw + 1} height={h} fill={`url(#${id}f)`} />;
        x += fw;
        return r;
      })}
      <Rect x={0} y={0} width={w} height={h} fill={`url(#${id}v)`} />
      {/* gold termeh border down the inner edge */}
      <Rect x={side === 'l' ? w - 14 : 0} y={0} width={14} height={h} fill={`url(#${id}g)`} opacity={0.9} />
      <Rect x={side === 'l' ? w - 18 : 14} y={0} width={4} height={h} fill="#2A0C0A" opacity={0.8} />
      {/* scalloped hem with a gold band */}
      <Path d={hem} fill={`url(#${id}g)`} opacity={0.85} />
      <Rect x={0} y={h - 40} width={w} height={3} fill={tint} opacity={0.9} />
    </Svg>
  );
}

export function LaceCurtain({ delay = 90, duration = 1500, tint = '#E0B06A' }: { delay?: number; duration?: number; tint?: string }) {
  const { width, height } = useWindowDimensions();
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.55, 0.05, 0.25, 1) }, (fin) => {
      if (fin) runOnJS(setDone)(true);
    }));
  }, []);
  const half = width / 2 + 3;
  const panel = (dir: 1 | -1) => () => {
    'worklet';
    const v = t.value;
    // ripple while moving, one soft sway as it settles
    const wave = Math.sin(v * Math.PI * 3) * (1 - v) * 5;
    return {
      opacity: v < 0.82 ? 1 : 1 - (v - 0.82) / 0.18,
      transform: [
        { translateX: dir * v * half * 0.35 },
        { scaleX: 1 - v * 0.82 },
        { skewY: `${dir * wave}deg` },
        { translateY: -Math.sin(v * Math.PI) * 10 },
      ],
    };
  };
  const right = useAnimatedStyle(panel(1));
  const left = useAnimatedStyle(panel(-1));
  const light = useAnimatedStyle(() => ({ opacity: Math.sin(t.value * Math.PI) * 0.8, transform: [{ scaleX: 0.3 + t.value * 1.4 }] }));
  const glow = useAnimatedStyle(() => ({ opacity: Math.sin(t.value * Math.PI) * 0.9, transform: [{ scale: 0.6 + t.value * 0.7 }, { rotate: `${t.value * 50}deg` }] }));
  if (done) return null;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute', left: width / 2 - 40, top: 0, width: 80, height }, light]}>
        <View style={{ flex: 1, backgroundColor: tint, opacity: 0.18 }} />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: half, height, left: 0, transformOrigin: 'left center' } as any, left]} renderToHardwareTextureAndroid>
        <CurtainCloth w={half} h={height} side="l" tint={tint} />
      </Animated.View>
      <Animated.View style={[styles.panel, { width: half, height, right: 0, transformOrigin: 'right center' } as any, right]} renderToHardwareTextureAndroid>
        <CurtainCloth w={half} h={height} side="r" tint={tint} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute', left: width / 2 - 60, top: height * 0.32 - 60 }, glow]}>
        <Rosette size={120} color={tint} opacity={0.9} />
      </Animated.View>
    </View>
  );
}

/** A slow, endless rotation for doilies and rosettes that sit in the background. Slows down during deep listening. */
export function Spin({ children, period = 90000, style }: { children: React.ReactNode; period?: number; style?: any }) {
  const r = useSharedValue(0);
  const stretch = useStretch();
  useEffect(() => {
    const p = period * stretch;
    // Continue from the current angle so a tempo change never jumps.
    r.value = withTiming(r.value + 360 * 1000, { duration: p * 1000, easing: Easing.linear });
  }, [period, stretch]);
  const a = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value % 360}deg` }] }));
  return <Animated.View style={[a, style]} pointerEvents="none">{children}</Animated.View>;
}

const styles = StyleSheet.create({
  panel: { position: 'absolute', top: 0, overflow: 'hidden' },
});
