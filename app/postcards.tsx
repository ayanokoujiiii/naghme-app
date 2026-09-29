import React from 'react';
import { Alert, Dimensions, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Empty, Header, IconBtn, Pressy } from '@/src/ui/kit';
import { Ambient } from '@/src/ui/Ambient';
import { useData } from '@/src/hooks/useData';
import { deletePostcard, listPostcards } from '@/src/db/extra';
import { relTime } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';

export default function PostcardsScreen() {
  const cards = useData(listPostcards, []);
  const w = (Dimensions.get('window').width - 44) / 2;
  return (
    <View style={{ flex: 1 }}>
      <Ambient intensity={0.6} />
      <Header title="کارت‌پستال‌ها" subtitle="عکس‌نوشته‌های تو" right={<IconBtn name="plus" filled onPress={() => router.push('/postcard')} label="کارت تازه" />} />
      {cards.data && !cards.data.length ? (
        <Empty icon="image" title="هنوز کارتی نساخته‌ای" hint="یک بیت یا جملهٔ محبوب را روی جلد قطعه بنویس و برای دیگران بفرست." action="ساختن کارت" onAction={() => router.push('/postcard')} />
      ) : (
        <ScrollView contentContainerStyle={{ flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 140 }}>
          {(cards.data ?? []).map((c) => (
            <Pressy key={c.id} bloom onPress={() => router.push({ pathname: '/postcard', params: { id: c.id } })}
              onLongPress={() => Alert.alert('حذف کارت', `«${c.title}» حذف شود؟`, [{ text: 'انصراف', style: 'cancel' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deletePostcard(c.id); cards.reload(); }) }])}
              style={{ width: w }}>
              <View style={{ width: w, height: w * 1.25, borderRadius: 16, overflow: 'hidden', backgroundColor: C.surface, borderWidth: 0.5, borderColor: C.zarSoft }}>
                {c.preview ? <Image source={{ uri: c.preview }} style={{ flex: 1 }} contentFit="cover" /> : null}
              </View>
              <Txt v="small" numberOfLines={1} style={{ marginTop: 6 }}>{c.title}</Txt>
              <Txt v="caption">{relTime(c.updatedAt)}</Txt>
            </Pressy>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
