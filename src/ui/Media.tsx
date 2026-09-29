import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { C } from '../theme';
import { hash } from '../utils';
import { Txt } from './Txt';

const PLACEHOLDER_TONES = [
  ['#2A2723', '#161513'],
  ['#232629', '#141516'],
  ['#28252B', '#151416'],
  ['#262822', '#141513'],
];

export function Cover({ uri, size = 56, radius = 14, seed = '', icon = 'music', style, tint }: {
  uri?: string | null; size?: number | string; radius?: number; seed?: string; icon?: keyof typeof Feather.glyphMap; style?: StyleProp<ViewStyle>; tint?: string;
}) {
  const tones = PLACEHOLDER_TONES[Math.floor(hash(seed || 'x') * PLACEHOLDER_TONES.length)];
  const dim: any = typeof size === 'number' ? { width: size, height: size } : { width: size, aspectRatio: 1 };
  return (
    <View style={[dim, { borderRadius: radius, overflow: 'hidden', backgroundColor: C.bg3 }, style]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={350} />
      ) : (
        <LinearGradient colors={tones as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Feather name={icon} size={typeof size === 'number' ? Math.max(14, size * 0.3) : 28} color={tint ?? 'rgba(236,232,225,0.35)'} />
        </LinearGradient>
      )}
    </View>
  );
}

export function Avatar({ uri, name, size = 48, ring }: { uri?: string | null; name: string; size?: number; ring?: string }) {
  const initial = name?.trim()?.[0] ?? '؟';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, padding: ring ? 2 : 0, borderWidth: ring ? 1 : 0, borderColor: ring }}>
      <View style={{ flex: 1, borderRadius: size / 2, overflow: 'hidden', backgroundColor: C.bg3, alignItems: 'center', justifyContent: 'center' }}>
        {uri ? (
          <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={300} />
        ) : (
          <Txt v="h2" center color={C.accent} style={{ fontSize: size * 0.38, lineHeight: size * 0.6 }}>{initial}</Txt>
        )}
      </View>
    </View>
  );
}
