import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { C } from '../theme';
import { useStretch, useTint } from '../mood';
import { breathe } from './breathe';

/**
 * Slow drifting light behind every screen. Calm, never busy.
 * Its colour follows the sky of the moment (سحر، صبح، ظهرِ کویر، غروب، شب) and
 * the festivals of the Iranian year. During deep listening the drift slows down (کشش زمان).
 *
 * v1.1: drawn with plain SVG radial gradients inside native-transformed views.
 * No canvas, no live blur: nothing is redrawn per frame, the GPU only moves
 * three pre-drawn layers. This removed the crash on "back" and the scroll jank.
 */
let seq = 0;

function Glow({ size, color, strength }: { size: number; color: string; strength: number }) {
  const id = React.useRef(`amb${++seq}`).current;
  return (
    <Svg width={size} height={size} pointerEvents="none">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={strength} />
          <Stop offset="0.45" stopColor={color} stopOpacity={strength * 0.45} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}

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

  const s1 = w * 1.3;
  const s2 = w * 1.15;
  const s3 = w * 1.3;
  const a1 = useAnimatedStyle(() => ({
    transform: [
      { translateX: w * (0.75 - 0.35 * t.value) - s1 / 2 },
      { translateY: h * (0.1 + 0.08 * Math.sin(t.value * Math.PI * 2)) - s1 / 2 },
    ],
  }));
  const a2 = useAnimatedStyle(() => ({
    transform: [{ translateX: w * (0.15 + 0.3 * t.value) - s2 / 2 }, { translateY: h * (0.55 - 0.12 * t.value) - s2 / 2 }],
  }));
  const a3 = useAnimatedStyle(() => ({
    transform: [{ translateX: w * (0.6 + 0.2 * Math.cos(t.value * Math.PI * 2)) - s3 / 2 }, { translateY: h * (0.95 - 0.1 * t.value) - s3 / 2 }],
  }));

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, overflow: 'hidden' }]} pointerEvents="none">
      <Animated.View style={[styles.layer, { width: s1, height: s1 }, a1]} renderToHardwareTextureAndroid>
        {/* keyed by colour so a new sky cross-fades in over a few seconds */}
        <Animated.View key={main} entering={FadeIn.duration(3500)} exiting={FadeOut.duration(3500)} style={StyleSheet.absoluteFill}>
          <Glow size={s1} color={main} strength={0.34 * intensity} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.layer, { width: s2, height: s2 }, a2]} renderToHardwareTextureAndroid>
        <Animated.View key={second} entering={FadeIn.duration(3500)} exiting={FadeOut.duration(3500)} style={StyleSheet.absoluteFill}>
          <Glow size={s2} color={second} strength={0.2 * intensity} />
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.layer, { width: s3, height: s3 }, a3]} renderToHardwareTextureAndroid>
        <Glow size={s3} color="#9C8FA8" strength={0.13 * intensity} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, top: 0 },
});
