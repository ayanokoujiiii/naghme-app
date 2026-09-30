import React from 'react';
import { TermehProvider } from '@/src/motifs/Termeh';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Chip, Empty, Header, IconBtn, Loading, row } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { RecordingItem } from '@/src/ui/rows';
import { useData } from '@/src/hooks/useData';
import { albumRecordings, deleteAlbum, getAlbum } from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { fmtMinutes, toFa } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';

export default function AlbumScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const al = useData(() => getAlbum(id), [id]);
  const recs = useData(() => albumRecordings(id), [id]);
  if (al.loading) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  const album = al.data;
  if (!album) return <View style={{ flex: 1, backgroundColor: C.bg }}><Empty title="این آلبوم پیدا نشد" /></View>;
  const total = (recs.data ?? []).reduce((s, r) => s + (r.duration ?? 0), 0);
  const size = Math.min(width * 0.62, 260);
  return (
    <TermehProvider pattern="boteh">
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {album.cover ? <Image source={{ uri: album.cover }} style={[StyleSheet.absoluteFill, { opacity: 0.55 }]} blurRadius={60} contentFit="cover" /> : null}
      <LinearGradient colors={['rgba(11,11,12,0.3)', C.bg]} locations={[0, 0.6]} style={StyleSheet.absoluteFill} />
      <Header right={<IconBtn name="edit-2" onPress={() => router.push({ pathname: '/edit/album', params: { id: album.id } })} />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }}>
        <Animated.View entering={FadeInDown.duration(700)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <View style={{ elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 20, borderRadius: 24 }}>
            <Cover uri={album.cover} size={size} radius={24} seed={album.id} icon="disc" />
          </View>
          <Txt v="title" center style={{ marginTop: 18 }}>{album.title}</Txt>
          <Txt v="small" center>{[album.year && toFa(album.year), album.label, recs.data?.length ? `${toFa(recs.data.length)} قطعه` : null, total ? fmtMinutes(total) : null].filter(Boolean).join(' · ')}</Txt>
          <View style={[row, { gap: 10, marginTop: 18 }]}>
            <Button label="پخش آلبوم" icon="play" disabled={!recs.data?.some((r) => r.audioUri)} onPress={() => playRows(recs.data!)} />
          </View>
          {album.notes ? <Txt v="small" center style={{ marginTop: 16 }}>{album.notes}</Txt> : null}
        </Animated.View>
        <View style={{ marginTop: 24 }}>
          {recs.data?.map((r, i) => <RecordingItem key={r.id} r={r} index={i} number={r.trackNo ?? i + 1} showCover={false} onPlay={() => playRows(recs.data!, r.id)} />)}
        </View>
        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Chip label="حذف آلبوم" icon="trash-2" onPress={() => Alert.alert('حذف آلبوم', 'آلبوم حذف شود؟ قطعه‌ها باقی می‌مانند.', [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteAlbum(album.id); router.back(); }) }])} />
        </View>
      </ScrollView>
    </View>
    </TermehProvider>
  );
}
