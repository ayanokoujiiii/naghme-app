import React, { useEffect, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { C } from '../theme';
import { useStretch } from '../mood';
import { LaceEdge, LaceNet, Rosette } from '../motifs/Ornament';

/**
 * Custom entering animation: content unfolds towards the viewer like a page
 * being laid flat, instead of a plain fade.
 */
export function unfold(delay = 0, duration = 760) {
  return () => {
    'worklet';
    const ease = Easing.bezier(0.2, 0.8, 0.2, 1);
    return {
      initialValues: { opacity: 0, transform: [{ perspective: 900 }, { rotateX: '24deg' }, { translateY: 28 }, { scale: 0.97 }] },
      animations: {
        opacity: withDelay(delay, withTiming(1, { duration: duration * 0.7 })),
        transform: [
          { perspective: 900 },
          { rotateX: withDelay(delay, withTiming('0deg', { duration, easing: ease })) },
          { translateY: withDelay(delay, withTiming(0, { duration, easing: ease })) },
          { scale: withDelay(delay, withTiming(1, { duration, easing: ease })) },
        ],
      },
    };
  };
}

/**
 * The lace curtain. Two crocheted panels cover the screen and part slowly,
 * like the curtains of an old Tehran living room being drawn at dawn.
 */
export function LaceCurtain({ delay = 120, duration = 1300, tint = C.zar }: { delay?: number; duration?: number; tint?: string }) {
  const { width, height } = useWindowDimensions();
  const [done, setDone] = useState(false);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withTiming(1, { duration, easing: Easing.bezier(0.65, 0, 0.25, 1) }, (fin) => {
      if (fin) runOnJS(setDone)(true);
    }));
  }, []);
  const half = width / 2 + 2;
  const right = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.35,
    transform: [
      { perspective: 1200 },
      { translateX: t.value * half * 1.08 },
      { rotateY: `${-t.value * 38}deg` },
      { scaleX: 1 - t.value * 0.45 },
    ],
  }));
  const left = useAnimatedStyle(() => ({
    opacity: 1 - t.value * 0.35,
    transform: [
      { perspective: 1200 },
      { translateX: -t.value * half * 1.08 },
      { rotateY: `${t.value * 38}deg` },
      { scaleX: 1 - t.value * 0.45 },
    ],
  }));
  const glow = useAnimatedStyle(() => ({ opacity: Math.sin(t.value * Math.PI) * 0.9, transform: [{ scale: 0.6 + t.value * 0.8 }, { rotate: `${t.value * 60}deg` }] }));
  if (done) return null;
  const Panel = ({ side }: { side: 'l' | 'r' }) => (
    <Animated.View style={[styles.panel, { width: half, height }, side === 'r' ? { right: 0 } : { left: 0 }, side === 'r' ? right : left]}>
      <LaceNet width={half} height={height} cell={24} color={tint} opacity={0.55} />
      <View style={[StyleSheet.absoluteFill, { borderColor: `${tint}55`, [side === 'r' ? 'borderLeftWidth' : 'borderRightWidth']: 1 }]} />
      <LaceEdge width={half} height={26} color={tint} style={{ position: 'absolute', bottom: 0 }} />
    </Animated.View>
  );
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Panel side="l" />
      <Panel side="r" />
      <Animated.View style={[{ position: 'absolute', left: width / 2 - 70, top: height * 0.32 - 70 }, glow]}>
        <Rosette size={140} color={tint} opacity={0.9} />
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
  panel: { position: 'absolute', top: 0, backgroundColor: 'rgba(14,12,10,0.94)', overflow: 'hidden' },
});
