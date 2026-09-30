import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { C } from '../theme';
import { fmtTime } from '../utils';
import { tap } from './kit';
import { Txt } from './Txt';

/**
 * «جلوبردن آهنگ روی سیم‌های سنتور»
 * The seek bar is a santur: 18 courses of 4 strings (72 strings, like the real
 * instrument) with their خرک bridges. Drag across it and every course you cross
 * is plucked (it vibrates and you feel a light tick); let go to jump there.
 * Time runs left to right even in RTL layouts, like every media control.
 *
 * v1.1: static parts are one SVG (redrawn only when a course lights up, 18 times
 * per track); the vibrating course is four thin native views. No canvas.
 */
const COURSES = 18;
const PER_COURSE = 4;
const H = 62;
const INSET = 16;

export function SanturScrubber({ position, duration, onSeek, under }: {
  position: number; duration: number; onSeek: (s: number) => void; under?: React.ReactNode;
}) {
  const [w, setW] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const dragging = useSharedValue(0);
  const dragX = useSharedValue(0);
  const lastCourse = useSharedValue(-1);
  const pluckX = useSharedValue(-100);
  const amp = useSharedValue(0);

  const left = INSET + 6;
  const right = Math.max(left + 1, w - INSET - 6);
  const span = right - left;
  const gap = span / (COURSES - 1);

  const shown = preview ?? position;
  const frac = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const lit = Math.floor(frac * COURSES + 0.0001);

  const art = useMemo(() => {
    if (!w) return null;
    const body = `M0 ${H - 3} L${INSET} 3 L${w - INSET} 3 L${w} ${H - 3} Z`;
    let played = '';
    let rest = '';
    const bridges: { x: number; y: number; on: boolean }[] = [];
    for (let c = 0; c < COURSES; c++) {
      const x0 = left + c * gap - (PER_COURSE - 1) * 0.7;
      let d = '';
      for (let k = 0; k < PER_COURSE; k++) {
        const x = x0 + k * 1.4;
        d += `M${x.toFixed(1)} 8V${H - 8}`;
      }
      if (c < lit) played += d; else rest += d;
      bridges.push({ x: left + c * gap, y: c % 2 ? H * 0.34 : H * 0.66, on: c < lit });
    }
    return { body, played, rest, bridges };
  }, [w, lit, left, gap]);

  const ring = (course: number, strength = 1) => {
    'worklet';
    pluckX.value = left + course * gap - (PER_COURSE - 1) * 0.7;
    amp.value = withSequence(
      withTiming(4 * strength, { duration: 35 }),
      withTiming(-3 * strength, { duration: 70 }),
      withTiming(2 * strength, { duration: 80 }),
      withTiming(-1.2 * strength, { duration: 90 }),
      withTiming(0, { duration: 120 }),
    );
  };

  // As the music passes a course, that course rings softly by itself.
  const prevLit = useRef(lit);
  useEffect(() => {
    if (preview === null && lit !== prevLit.current && lit > 0 && w) ring(lit - 1, 0.45);
    prevLit.current = lit;
  }, [lit]);

  const courseAt = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(COURSES - 1, Math.round((x - left) / Math.max(1, gap))));
  };
  const fracAt = (x: number) => {
    'worklet';
    return Math.max(0, Math.min(1, (x - left) / Math.max(1, span)));
  };
  const haptic = () => tap('select');

  const pan = Gesture.Pan()
    .hitSlop({ top: 12, bottom: 12 })
    .minDistance(0)
    .onBegin((e) => {
      dragging.value = 1;
      dragX.value = e.x;
      const c = courseAt(e.x);
      lastCourse.value = c;
      ring(c);
      runOnJS(haptic)();
      runOnJS(setPreview)(fracAt(e.x) * duration);
    })
    .onChange((e) => {
      dragX.value = e.x;
      const c = courseAt(e.x);
      if (c !== lastCourse.value) {
        lastCourse.value = c;
        ring(c);
        runOnJS(haptic)();
      }
      runOnJS(setPreview)(fracAt(e.x) * duration);
    })
    .onFinalize(() => {
      if (dragging.value && duration > 0) runOnJS(onSeek)(fracAt(dragX.value) * duration);
      dragging.value = 0;
      runOnJS(setPreview)(null);
    });

  const s0 = useAnimatedStyle(() => ({ transform: [{ translateX: pluckX.value + amp.value }] }));
  const s1 = useAnimatedStyle(() => ({ transform: [{ translateX: pluckX.value + 1.4 + amp.value * 0.88 }] }));
  const s2 = useAnimatedStyle(() => ({ transform: [{ translateX: pluckX.value + 2.8 + amp.value * 0.76 }] }));
  const s3 = useAnimatedStyle(() => ({ transform: [{ translateX: pluckX.value + 4.2 + amp.value * 0.64 }] }));
  const glow = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.abs(amp.value) / 3) }));

  const headX = left + frac * span;
  const active = preview !== null;
  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)} collapsable={false}>
          {art ? (
            <Svg width={w} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
              <Path d={art.body} fill={C.zar} fillOpacity={0.12} stroke={C.zar} strokeOpacity={0.7} strokeWidth={1} />
              <Path d={art.rest} stroke={C.text} strokeOpacity={0.42} strokeWidth={0.8} />
              <Path d={art.played} stroke={C.zarBright} strokeOpacity={1} strokeWidth={0.95} />
              {art.bridges.map((b, i) => (
                <Circle key={i} cx={b.x} cy={b.y} r={2.2} fill={b.on ? C.zarBright : 'rgba(236,232,225,0.55)'} />
              ))}
              {/* مضراب: the little mallet head marks where you are. */}
              <Circle cx={headX} cy={H - 4} r={active ? 10 : 8} fill={C.zar} fillOpacity={0.3} />
              <Circle cx={headX} cy={H - 4} r={active ? 5.5 : 4.5} fill={C.text} />
            </Svg>
          ) : null}
          {w ? (
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, glow]}>
              {[s0, s1, s2, s3].map((st, k) => (
                <Animated.View key={k} style={[styles.string, st]} />
              ))}
            </Animated.View>
          ) : null}
        </View>
      </GestureDetector>
      {under}
      <View style={styles.times}>
        <Txt v="caption" left color={C.dim}>{fmtTime(shown)}</Txt>
        <Txt v="caption" color={C.dim}>{duration ? `-${fmtTime(Math.max(0, duration - shown))}` : ''}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  string: { position: 'absolute', left: 0, top: 8, width: 1.2, height: H - 16, backgroundColor: '#F7DDA8', borderRadius: 1 },
});
