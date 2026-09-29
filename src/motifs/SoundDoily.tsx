import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { high, level, low, playingFlag, real } from '../audio/levels';
import { C } from '../theme';
import { useStretch } from '../mood';
import { breathe } from '../ui/breathe';
import { Doily, Rosette } from './Ornament';

/**
 * The listening mandala. A crocheted doily behind the cover that breathes with
 * the music: the outer lace opens with the sparkle of the sound, the inner
 * rosette swells with its body, and everything turns slowly, like a record.
 */
export function SoundDoily({ size, seed, tint = C.zar }: { size: number; seed: string; tint?: string }) {
  const t = useSharedValue(0);
  const spin = useSharedValue(0);
  const stretch = useStretch();
  useEffect(() => {
    // «کشش زمان»: in deep listening the breath and the turn are slower and longer.
    breathe(t, 3600 * stretch);
    spin.value = withTiming(spin.value + 360 * 500, { duration: 120000 * stretch * 500, easing: Easing.linear });
  }, [stretch]);

  const outer = useAnimatedStyle(() => {
    const synthetic = playingFlag.value * (0.25 + t.value * 0.25);
    const e = real.value ? level.value : synthetic;
    const h = real.value ? high.value : synthetic * 0.6;
    return {
      opacity: 0.35 + e * 0.6,
      transform: [{ rotate: `${spin.value % 360}deg` }, { scale: 0.92 + e * 0.1 + h * 0.08 }],
    };
  });
  const inner = useAnimatedStyle(() => {
    const synthetic = playingFlag.value * (0.2 + t.value * 0.3);
    const l = real.value ? low.value : synthetic;
    return {
      opacity: 0.25 + l * 0.7,
      transform: [{ rotate: `${-(spin.value * 2) % 360}deg` }, { scale: 0.55 + l * 0.25 }],
    };
  });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
      <Animated.View style={[{ position: 'absolute' }, outer]}>
        <Doily size={size} seed={seed} color={tint} fill={0.14} />
      </Animated.View>
      <Animated.View style={[{ position: 'absolute' }, inner]}>
        <Rosette size={size * 0.9} color={tint} opacity={0.6} />
      </Animated.View>
    </View>
  );
}
