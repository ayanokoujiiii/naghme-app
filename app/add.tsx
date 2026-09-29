import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Pressy, row } from '@/src/ui/kit';
import { Sheet } from '@/src/ui/Sheet';

const ITEMS: { icon: any; title: string; hint: string; to: string }[] = [
  { icon: 'download', title: 'وارد کردن موسیقی', hint: 'FLAC، WAV، ALAC، MP3، DSD و…', to: '/import' },
  { icon: 'user', title: 'هنرمند', hint: 'خواننده، نوازنده، آهنگساز، شاعر', to: '/edit/artist' },
  { icon: 'feather', title: 'اثر', hint: 'تصنیف، آواز، سونات، سمفونی…', to: '/edit/work' },
  { icon: 'disc', title: 'آلبوم', hint: 'مجموعهٔ منتشرشده', to: '/edit/album' },
  { icon: 'list', title: 'مجموعهٔ شخصی', hint: 'برای حال‌وهوای خودت', to: '/edit/collection' },
  { icon: 'book-open', title: 'یادداشت', hint: 'حس و حال یک شنیدن', to: '/journal?compose=1' },
];

export default function AddMenu() {
  return (
    <Sheet>
      <Txt v="h2" style={{ paddingHorizontal: 24, marginBottom: 8 }}>افزودن به آرشیو</Txt>
      {ITEMS.map((it, i) => (
        <Animated.View key={it.to} entering={FadeInDown.delay(i * 45).duration(300)}>
          <Pressy onPress={() => { router.back(); router.push(it.to as any); }} style={[row, { paddingHorizontal: 22, paddingVertical: 11 }]} scaleTo={0.98}>
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name={it.icon} size={18} color={C.accent} />
            </View>
            <View style={{ marginRight: 14 }}>
              <Txt v="h3">{it.title}</Txt>
              <Txt v="caption">{it.hint}</Txt>
            </View>
          </Pressy>
        </Animated.View>
      ))}
    </Sheet>
  );
}
