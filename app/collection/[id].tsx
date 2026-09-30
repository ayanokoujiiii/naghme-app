import React from 'react';
import { TermehProvider } from '@/src/motifs/Termeh';
import { Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Chip, Empty, Header, IconBtn, Loading, row } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { RecordingItem } from '@/src/ui/rows';
import { Ambient } from '@/src/ui/Ambient';
import { useData } from '@/src/hooks/useData';
import { collectionRecordings, deleteCollection, getCollection, removeFromCollection } from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { toFa } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const col = useData(() => getCollection(id), [id]);
  const recs = useData(() => collectionRecordings(id), [id]);
  if (col.loading) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  const c = col.data;
  if (!c) return <View style={{ flex: 1, backgroundColor: C.bg }}><Empty title="مجموعه پیدا نشد" /></View>;
  return (
    <TermehProvider pattern="gol">
    <View style={{ flex: 1 }}>
      <Ambient intensity={0.8} />
      <Header right={<IconBtn name="edit-2" onPress={() => router.push({ pathname: '/edit/collection', params: { id: c.id } })} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <Animated.View entering={FadeInDown.duration(600)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <Cover uri={c.cover} size={170} radius={28} seed={c.id} icon="list" />
          <Txt v="title" center style={{ marginTop: 16 }}>{c.title}</Txt>
          {c.description ? <Txt v="small" center>{c.description}</Txt> : null}
          <Txt v="caption" center style={{ marginTop: 4 }}>{`${toFa(recs.data?.length ?? 0)} قطعه`}</Txt>
          <View style={[row, { gap: 10, marginTop: 16 }]}>
            <Button label="پخش" icon="play" disabled={!recs.data?.length} onPress={() => playRows(recs.data!)} />
            <Button label="تصادفی" icon="shuffle" kind="ghost" disabled={!recs.data?.length} onPress={() => playRows([...(recs.data ?? [])].sort(() => Math.random() - 0.5))} />
          </View>
        </Animated.View>
        <View style={{ marginTop: 20 }}>
          {recs.data?.length ? recs.data.map((r, i) => (
            <View key={r.id}>
              <RecordingItem r={r} index={i} onPlay={() => playRows(recs.data!, r.id)} />
            </View>
          )) : <Empty icon="plus" title="مجموعه خالی است" hint="از منوی هر قطعه، «افزودن به مجموعه» را بزن." />}
        </View>
        {recs.data?.length ? <Txt v="caption" center style={{ marginTop: 10 }}>برای برداشتن قطعه، از منوی قطعه «برداشتن از مجموعه» را بزن.</Txt> : null}
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Chip label="حذف مجموعه" icon="trash-2" onPress={() => Alert.alert('حذف مجموعه', 'مجموعه حذف شود؟', [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteCollection(c.id); router.back(); }) }])} />
        </View>
      </ScrollView>
    </View>
    </TermehProvider>
  );
}
