import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { C } from '../theme';
import { fmtTime } from '../utils';
import { Txt } from './Txt';

/** Time runs left to right even in RTL layouts (media controls are never mirrored). */
export function Scrubber({ position, duration, onSeek }: { position: number; duration: number; onSeek: (s: number) => void }) {
  const [w, setW] = useState(1);
  const dragging = useSharedValue(0);
  const dragX = useSharedValue(0);
  const [preview, setPreview] = useState<number | null>(null);
  const frac = duration > 0 ? Math.min(1, position / duration) : 0;

  const pan = Gesture.Pan()
    .hitSlop({ top: 16, bottom: 16 })
    .onBegin((e) => {
      dragging.value = 1;
      dragX.value = Math.min(w, Math.max(0, e.x));
      runOnJS(setPreview)((dragX.value / w) * duration);
    })
    .onChange((e) => {
      dragX.value = Math.min(w, Math.max(0, e.x));
      runOnJS(setPreview)((dragX.value / w) * duration);
    })
    .onFinalize(() => {
      if (dragging.value) runOnJS(onSeek)((dragX.value / w) * duration);
      dragging.value = 0;
      runOnJS(setPreview)(null);
    });

  const fill = useAnimatedStyle(() => ({ width: dragging.value ? dragX.value : frac * w }), [frac, w]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: (dragging.value ? dragX.value : frac * w) - 7 }, { scale: withSpring(dragging.value ? 1.4 : 1) }],
  }), [frac, w]);

  const shown = preview ?? position;
  return (
    <View>
      <GestureDetector gesture={pan}>
        <View style={styles.hit} onLayout={(e) => setW(Math.max(1, e.nativeEvent.layout.width))}>
          <View style={styles.track}>
            <Animated.View style={[styles.fill, fill]} />
          </View>
          <Animated.View style={[styles.knob, knob]} />
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Txt v="caption" left>{fmtTime(shown)}</Txt>
        <Txt v="caption">{duration ? `-${fmtTime(Math.max(0, duration - shown))}` : ''}</Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hit: { height: 28, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', flexDirection: 'row' },
  fill: { height: 3, backgroundColor: C.text },
  knob: { position: 'absolute', left: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: C.text },
  times: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
});
