import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { C } from '../theme';
import { usePlayer, currentItem, togglePlay, next } from '../audio/player';
import { Txt } from './Txt';
import { Pressy, row } from './kit';
import { Cover } from './Media';

export function MiniPlayer({ bottom }: { bottom: number }) {
  const item = usePlayer((s) => currentItem(s));
  const playing = usePlayer((s) => s.playing);
  const progress = usePlayer((s) => (s.duration ? s.position / s.duration : 0));
  if (!item) return null;
  return (
    <Animated.View entering={FadeInDown.springify().damping(16)} exiting={FadeOutDown} style={[styles.wrap, { bottom }]}>
      <Pressy onPress={() => router.push('/player')} scaleTo={0.98} haptic={false}>
        <BlurView intensity={45} tint="dark" experimentalBlurMethod="dimezisBlurView" style={styles.blur}>
          <View style={[row, { paddingHorizontal: 10, paddingVertical: 8 }]}>
            <Cover uri={item.cover} size={42} radius={11} seed={item.id} />
            <View style={{ flex: 1, marginHorizontal: 12 }}>
              <Txt v="h3" numberOfLines={1} style={{ fontSize: 14 }}>{item.title}</Txt>
              <Txt v="caption" numberOfLines={1}>{item.artist || 'نغمه'}</Txt>
            </View>
            <Pressy onPress={() => void togglePlay()} scaleTo={0.85} style={styles.btn}>
              <Feather name={playing ? 'pause' : 'play'} size={20} color={C.text} />
            </Pressy>
            <Pressy onPress={() => void next()} scaleTo={0.85} style={styles.btn}>
              <Feather name="skip-forward" size={18} color={C.dim} />
            </Pressy>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, progress * 100)}%` }]} />
          </View>
        </BlurView>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12 },
  blur: { borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(24,23,22,0.72)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong },
  btn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  track: { height: 2, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row' },
  fill: { height: 2, backgroundColor: C.accent },
});
