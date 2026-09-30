import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { C } from '../theme';
import { doily } from '../motifs/geometry';
import { tap } from './kit';

/**
 * «شکافتن رومیزی»: whenever something is deleted, a crocheted doily appears and
 * slowly comes apart. The lace loosens, turns and drifts away while a loose
 * strand of yarn falls, as if someone pulled the end of the thread.
 *
 * Use `unravel(() => deleteSomething())` in place of calling the delete directly.
 * v1.1: SVG layers moved by native transforms (no canvas).
 */
interface UnravelState { key: number; seed: string; run: (() => void | Promise<void>) | null }
const useUnravel = create<UnravelState>(() => ({ key: 0, seed: 'naghme', run: null }));

export function unravel(action: () => void | Promise<void>, seed = 'naghme') {
  tap('medium');
  useUnravel.setState((s) => ({ key: s.key + 1, seed, run: action }));
}

const DURATION = 1300;

export function UnravelHost() {
  const { key, seed, run } = useUnravel();
  if (!key || !run) return null;
  return <UnravelPlay key={key} seed={seed} run={run} />;
}

function UnravelPlay({ seed, run }: { seed: string; run: () => void | Promise<void> }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.72, 280);
  const L = useMemo(() => doily(size / 2, seed), [size, seed]);
  const yarnH = height * 0.5;
  const yarn = useMemo(() => {
    let d = `M${size / 2} 0`;
    for (let i = 1; i <= 16; i++) {
      const y = i * (yarnH / 16);
      d += ` Q${size / 2 + (i % 2 ? 16 : -16) * (1 - i / 22)} ${y - yarnH / 32} ${size / 2 + (i % 2 ? 4 : -4)} ${y}`;
    }
    return d;
  }, [size, yarnH]);

  const t = useSharedValue(0);
  const done = () => useUnravel.setState({ run: null });
  useEffect(() => {
    t.value = withTiming(1, { duration: DURATION, easing: Easing.bezier(0.45, 0, 0.35, 1) }, (fin) => {
      if (fin) runOnJS(done)();
    });
    // The real deletion happens while the doily hides the screen.
    const h = setTimeout(() => { void Promise.resolve(run()).catch(() => undefined); }, DURATION * 0.3);
    return () => clearTimeout(h);
  }, []);

  const veil = useAnimatedStyle(() => ({ opacity: Math.sin(Math.min(1, t.value) * Math.PI) * 0.6 }));
  const body = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 6) * (1 - Math.max(0, (t.value - 0.25) / 0.6)),
    transform: [{ rotate: `${t.value * 40}deg` }, { scale: 1 + t.value * 0.18 }],
  }));
  const eyes = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 6) * (1 - t.value),
    transform: [{ rotate: `${-t.value * 52}deg` }, { scale: 1 + t.value * 0.7 }],
  }));
  const thread = useAnimatedStyle(() => ({
    opacity: Math.min(1, t.value * 6) * (1 - Math.max(0, (t.value - 0.12) / 0.75)),
    transform: [{ rotate: `${t.value * 120}deg` }, { scale: 1 - t.value * 0.35 }],
  }));
  const yarnStyle = useAnimatedStyle(() => {
    const u = Math.max(0, Math.min(1, (t.value - 0.15) / 0.7));
    return {
      opacity: t.value < 0.85 ? 1 : 1 - (t.value - 0.85) / 0.15,
      height: Math.max(1, u * yarnH),
    };
  });

  const top = height * 0.42 - size / 2;
  const leftX = width / 2 - size / 2;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.black }, veil]} />
      <View style={{ position: 'absolute', left: leftX, top, width: size, height: size }} pointerEvents="none">
        <Animated.View style={[StyleSheet.absoluteFill, body]}>
          <Svg width={size} height={size}>
            <Path d={L.body} fill={C.zar} fillOpacity={0.25} stroke={C.zarBright} strokeWidth={1.1} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, eyes]}>
          <Svg width={size} height={size}>
            <Path d={L.eyelets} fill="none" stroke={C.zarBright} strokeWidth={0.9} />
          </Svg>
        </Animated.View>
        <Animated.View style={[StyleSheet.absoluteFill, thread]}>
          <Svg width={size} height={size}>
            <Path d={L.thread} fill="none" stroke={C.zar} strokeWidth={1.2} strokeLinecap="round" />
          </Svg>
        </Animated.View>
      </View>
      <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: leftX, top: top + size - 6, width: size, overflow: 'hidden' }, yarnStyle]}>
        <Svg width={size} height={yarnH}>
          <Path d={yarn} fill="none" stroke="#F3D9A8" strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}
