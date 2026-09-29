import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Circle, Group, Path, Skia } from '@shopify/react-native-skia';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { C } from '../theme';
import { fmtTime } from '../utils';
import { tap } from './kit';
import { Txt } from './Txt';

/**
 * «جلوبردن آهنگ روی سیم‌های سنتور»
 * The seek bar is a santur: 18 courses of 4 strings (72 strings, like the real
 * instrument) with their خرک bridges. Drag across it and every course you cross
 * is plucked (it vibrates and you feel a light tick); let go to jump there.
 * While the music plays, each course lights up and rings as time passes it.
 * Time runs left to right even in RTL layouts, like every media control.
 */
const COURSES = 18;
const PER_COURSE = 4;
const H = 58;
const INSET = 16;

export function SanturScrubber({ position, duration, onSeek, under }: {
  position: number; duration: number; onSeek: (s: number) => void; under?: React.ReactNode;
}) {
  const [w, setW] = useState(0);
  const [preview, setPreview] = useState<number | null>(null);
  const dragging = useSharedValue(0);
  const dragX = useSharedValue(0);
  const lastCourse = useSharedValue(-1);
  const pluck = useSharedValue(-1);
  const amp = useSharedValue(0);

  const left = INSET + 6;
  const right = Math.max(left + 1, w - INSET - 6);
  const span = right - left;
  const gap = span / (COURSES - 1);

  const shown = preview ?? position;
  const frac = duration > 0 ? Math.min(1, Math.max(0, shown / duration)) : 0;
  const lit = Math.floor(frac * COURSES + 0.0001);

  // The trapezoid body and the two rows of bridges never change for a given width.
  const body = useMemo(() => {
    const p = Skia.Path.Make();
    if (!w) return p;
    p.moveTo(0, H - 3);
    p.lineTo(INSET, 3);
    p.lineTo(w - INSET, 3);
    p.lineTo(w, H - 3);
    p.close();
    return p;
  }, [w]);

  const strings = useMemo(() => {
    const played = Skia.Path.Make();
    const rest = Skia.Path.Make();
    const bridges: { x: number; y: number; on: boolean }[] = [];
    if (!w) return { played, rest, bridges };
    for (let c = 0; c < COURSES; c++) {
      const target = c < lit ? played : rest;
      const x0 = left + c * gap - (PER_COURSE - 1) * 0.65;
      for (let k = 0; k < PER_COURSE; k++) {
        const x = x0 + k * 1.3;
        target.moveTo(x, 8);
        target.lineTo(x, H - 8);
      }
      // خرک: bridges alternate between the upper and lower thirds, as on a santur.
      bridges.push({ x: left + c * gap, y: c % 2 ? H * 0.34 : H * 0.66, on: c < lit });
    }
    return { played, rest, bridges };
  }, [w, lit, left, gap]);

  const vibrating = useDerivedValue(() => {
    const p = Skia.Path.Make();
    const c = pluck.value;
    if (c < 0 || !span) return p;
    const x0 = left + c * gap - (PER_COURSE - 1) * 0.65;
    for (let k = 0; k < PER_COURSE; k++) {
      const x = x0 + k * 1.3;
      p.moveTo(x, 8);
      p.quadTo(x + amp.value * (1 - k * 0.12), H / 2, x, H - 8);
    }
    return p;
  });

  const ring = (course: number, strength = 1) => {
    'worklet';
    pluck.value = course;
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
    if (preview === null && lit !== prevLit.current && lit > 0) ring(lit - 1, 0.45);
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

  const headX = left + frac * span;
  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={{ height: H }} onLayout={(e) => setW(e.nativeEvent.layout.width)}>
          {w ? (
            <Canvas style={StyleSheet.absoluteFill}>
              <Path path={body} color={C.zar} opacity={0.07} />
              <Path path={body} color={C.zar} opacity={0.35} style="stroke" strokeWidth={0.8} />
              <Path path={strings.rest} color={C.text} opacity={0.22} style="stroke" strokeWidth={0.6} />
              <Path path={strings.played} color={C.zar} opacity={0.9} style="stroke" strokeWidth={0.7} />
              <Path path={vibrating} color="#F3D9A8" style="stroke" strokeWidth={0.9} />
              <Group>
                {strings.bridges.map((b, i) => (
                  <Circle key={i} cx={b.x} cy={b.y} r={1.9} color={b.on ? C.zar : 'rgba(236,232,225,0.35)'} />
                ))}
              </Group>
              {/* مضراب: the little mallet head marks where you are. */}
              <Circle cx={headX} cy={H - 4} r={preview !== null ? 5.5 : 4} color={C.text} />
              <Circle cx={headX} cy={H - 4} r={preview !== null ? 9 : 7} color={C.zar} opacity={0.25} />
            </Canvas>
          ) : null}
        </View>
      </GestureDetector>
      {under}
      <View style={styles.times}>
        <Txt v="caption" left>{fmtTime(shown)}</Txt>
        <Txt v="caption">{duration ? `-${fmtTime(Math.max(0, duration - shown))}` : ''}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
});
