import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Blur, Canvas, Circle, Group, Rect } from '@shopify/react-native-skia';
import { Easing, interpolateColor, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';
import { C } from '../theme';
import { useStretch, useTint } from '../mood';
import { breathe } from './breathe';

/**
 * Slow drifting light behind every screen. Calm, never busy.
 * Its colour follows the sky of the moment (سحر، صبح، ظهرِ کویر، غروب، شب) and
 * the festivals of the Iranian year; changes cross-fade over a few seconds.
 * During deep listening the drift slows down (کشش زمان).
 */
export function Ambient({ tint, intensity = 1 }: { tint?: string; intensity?: number }) {
  const { width: w, height: h } = useWindowDimensions();
  const mood = useTint();
  const stretch = useStretch();
  const main = tint ?? mood.tint;
  const second = mood.second;

  const t = useSharedValue(0);
  useEffect(() => {
    breathe(t, 26000 * stretch);
  }, [stretch]);

  // Cross-fade between the previous and the new light.
  const from = useSharedValue(main);
  const to = useSharedValue(main);
  const mix = useSharedValue(1);
  const from2 = useSharedValue(second);
  const to2 = useSharedValue(second);
  useEffect(() => {
    if (to.value === main && to2.value === second) return;
    from.value = to.value;
    from2.value = to2.value;
    to.value = main;
    to2.value = second;
    mix.value = 0;
    mix.value = withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.quad) });
  }, [main, second]);
  const c1 = useDerivedValue(() => interpolateColor(mix.value, [0, 1], [from.value, to.value]));
  const c2 = useDerivedValue(() => interpolateColor(mix.value, [0, 1], [from2.value, to2.value]));

  const x1 = useDerivedValue(() => w * (0.75 - 0.35 * t.value));
  const y1 = useDerivedValue(() => h * (0.1 + 0.08 * Math.sin(t.value * Math.PI * 2)));
  const x2 = useDerivedValue(() => w * (0.15 + 0.3 * t.value));
  const y2 = useDerivedValue(() => h * (0.55 - 0.12 * t.value));
  const x3 = useDerivedValue(() => w * (0.6 + 0.2 * Math.cos(t.value * Math.PI * 2)));
  const y3 = useDerivedValue(() => h * (0.95 - 0.1 * t.value));
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Canvas style={StyleSheet.absoluteFill}>
        <Rect x={0} y={0} width={w} height={h} color={C.bg} />
        <Group opacity={0.2 * intensity}>
          <Blur blur={90} />
          <Circle cx={x1} cy={y1} r={w * 0.55} color={c1} />
        </Group>
        <Group opacity={0.1 * intensity}>
          <Blur blur={100} />
          <Circle cx={x2} cy={y2} r={w * 0.5} color={c2} />
        </Group>
        <Group opacity={0.07 * intensity}>
          <Blur blur={110} />
          <Circle cx={x3} cy={y3} r={w * 0.6} color="#9C8FA8" />
        </Group>
      </Canvas>
    </View>
  );
}
