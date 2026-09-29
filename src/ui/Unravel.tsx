import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Canvas, Group, Path, Skia, vec } from '@shopify/react-native-skia';
import Animated, { Easing, runOnJS, useAnimatedStyle, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { create } from 'zustand';
import { C } from '../theme';
import { doily } from '../motifs/geometry';
import { tap } from './kit';

/**
 * «شکافتن رومیزی»: whenever something is deleted, a crocheted doily appears and
 * slowly comes apart. Its thread unwinds, the lace loosens and drifts away and a
 * loose strand of yarn falls, as if someone pulled the end of the thread.
 *
 * Use `unravel(() => deleteSomething())` in place of calling the delete directly.
 */
interface UnravelState { key: number; seed: string; run: (() => void | Promise<void>) | null }
const useUnravel = create<UnravelState>(() => ({ key: 0, seed: 'naghme', run: null }));

export function unravel(action: () => void | Promise<void>, seed = 'naghme') {
  tap('medium');
  useUnravel.setState((s) => ({ key: s.key + 1, seed, run: action }));
}

const DURATION = 1400;

export function UnravelHost() {
  const { key, seed, run } = useUnravel();
  if (!key || !run) return null;
  return <UnravelPlay key={key} seed={seed} run={run} />;
}

function UnravelPlay({ seed, run }: { seed: string; run: () => void | Promise<void> }) {
  const { width, height } = useWindowDimensions();
  const size = Math.min(width * 0.72, 280);
  const cx = width / 2;
  const cy = height * 0.42;

  const paths = useMemo(() => {
    const L = doily(size / 2, seed, cx, cy);
    const make = (d: string) => Skia.Path.MakeFromSVGString(d) ?? Skia.Path.Make();
    // the loose strand of yarn falling from the edge of the doily
    const yarn = Skia.Path.Make();
    const startY = cy + size / 2 - 6;
    yarn.moveTo(cx, startY);
    for (let i = 1; i <= 16; i++) {
      const y = startY + i * ((height - startY) / 16);
      yarn.quadTo(cx + (i % 2 ? 16 : -16) * (1 - i / 22), y - (height - startY) / 32, cx + (i % 2 ? 4 : -4), y);
    }
    return { thread: make(L.thread), body: make(L.body), eyelets: make(L.eyelets), yarn };
  }, [size, seed, width, height]);

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

  const appear = useDerivedValue(() => Math.min(1, t.value * 6));
  const threadEnd = useDerivedValue(() => 1 - Math.max(0, (t.value - 0.12) / 0.75));
  const bodyOpacity = useDerivedValue(() => appear.value * (1 - Math.max(0, (t.value - 0.25) / 0.6)));
  const eyeOpacity = useDerivedValue(() => appear.value * (1 - t.value));
  const yarnEnd = useDerivedValue(() => Math.max(0, Math.min(1, (t.value - 0.15) / 0.7)));
  const yarnOpacity = useDerivedValue(() => (t.value < 0.85 ? 1 : 1 - (t.value - 0.85) / 0.15));
  const bodyTransform = useDerivedValue(() => [{ rotate: t.value * 0.7 }, { scale: 1 + t.value * 0.18 }]);
  const eyeTransform = useDerivedValue(() => [{ rotate: -t.value * 0.9 }, { scale: 1 + t.value * 0.7 }]);

  const veil = useAnimatedStyle(() => ({ opacity: Math.sin(Math.min(1, t.value) * Math.PI) * 0.55 }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.black }, veil]} />
      <Canvas style={StyleSheet.absoluteFill}>
        <Group origin={vec(cx, cy)} transform={bodyTransform} opacity={bodyOpacity}>
          <Path path={paths.body} color={C.zar} opacity={0.22} />
          <Path path={paths.body} color={C.zar} style="stroke" strokeWidth={1} />
        </Group>
        <Group origin={vec(cx, cy)} transform={eyeTransform} opacity={eyeOpacity}>
          <Path path={paths.eyelets} color={C.zar} style="stroke" strokeWidth={0.8} />
        </Group>
        <Path path={paths.thread} color={C.zar} style="stroke" strokeWidth={1.1} strokeCap="round" start={0} end={threadEnd} opacity={appear} />
        <Path path={paths.yarn} color="#F3D9A8" style="stroke" strokeWidth={1.2} strokeCap="round" start={0} end={yarnEnd} opacity={yarnOpacity} />
      </Canvas>
    </View>
  );
}
