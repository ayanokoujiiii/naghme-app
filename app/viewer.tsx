import React, { useState } from 'react';
import { Dimensions, FlatList, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeIn, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { IconBtn } from '@/src/ui/kit';
import { toFa } from '@/src/utils';

const { width: W, height: H } = Dimensions.get('window');

function Zoomable({ uri, onZoom }: { uri: string; onZoom: (z: boolean) => void }) {
  const scale = useSharedValue(1);
  const base = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);
  const dismissY = useSharedValue(0);

  const reset = () => {
    'worklet';
    scale.value = withSpring(1);
    base.value = 1;
    tx.value = withSpring(0);
    ty.value = withSpring(0);
    runOnJS(onZoom)(false);
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => { scale.value = Math.max(1, Math.min(5, base.value * e.scale)); })
    .onEnd(() => {
      base.value = scale.value;
      if (scale.value <= 1.02) reset(); else runOnJS(onZoom)(true);
    });
  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => { sx.value = tx.value; sy.value = ty.value; })
    .onUpdate((e) => {
      if (scale.value > 1) {
        tx.value = sx.value + e.translationX;
        ty.value = sy.value + e.translationY;
      } else if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
        dismissY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value <= 1) {
        if (Math.abs(dismissY.value) > 120 || Math.abs(e.velocityY) > 1200) runOnJS(router.back)();
        else dismissY.value = withSpring(0);
        return;
      }
      const mx = (W * (scale.value - 1)) / 2;
      const my = (H * (scale.value - 1)) / 2;
      tx.value = withSpring(Math.max(-mx, Math.min(mx, tx.value)));
      ty.value = withSpring(Math.max(-my, Math.min(my, ty.value)));
    });
  const dbl = Gesture.Tap().numberOfTaps(2).onEnd(() => {
    if (scale.value > 1) reset();
    else { scale.value = withTiming(2.5); base.value = 2.5; runOnJS(onZoom)(true); }
  });

  const st = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value + dismissY.value }, { scale: scale.value }],
    opacity: 1 - Math.min(0.6, Math.abs(dismissY.value) / 500),
  }));

  return (
    <GestureDetector gesture={Gesture.Simultaneous(pinch, pan, dbl)}>
      <Animated.View style={[{ width: W, height: H }, st]}>
        <Image source={{ uri }} style={{ width: W, height: H }} contentFit="contain" transition={250} />
      </Animated.View>
    </GestureDetector>
  );
}

export default function Viewer() {
  const p = useLocalSearchParams<{ images?: string; index?: string }>();
  const insets = useSafeAreaInsets();
  let images: string[] = [];
  try { images = JSON.parse(p.images ?? '[]'); } catch { images = []; }
  const start = Math.min(images.length - 1, Math.max(0, Number(p.index ?? 0) || 0));
  const [idx, setIdx] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  return (
    <Animated.View entering={FadeIn.duration(250)} style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(5,5,6,0.97)' }]}>
      <FlatList
        data={images}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        initialScrollIndex={start > 0 ? start : undefined}
        getItemLayout={(_, i) => ({ length: W, offset: W * i, index: i })}
        keyExtractor={(u, i) => `${u}-${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        renderItem={({ item }) => <Zoomable uri={item} onZoom={setZoomed} />}
      />
      <View style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <IconBtn name="x" onPress={() => router.back()} label="بستن" />
        {images.length > 1 ? <Txt v="caption" color={C.dim}>{`${toFa(idx + 1)} / ${toFa(images.length)}`}</Txt> : <View />}
      </View>
    </Animated.View>
  );
}
