import React, { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Pressy, row, Divider } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { Sheet } from '@/src/ui/Sheet';
import { useData } from '@/src/hooks/useData';
import {
  addToCollection, collectionsOf, deleteRecording, getRecording, listCollections, recArtistLine, recCover, removeFromCollection, saveCollection,
} from '@/src/db/repo';
import { playNext, forgetLoaded, usePlayer, currentItem, stopPlayback } from '@/src/audio/player';
import { playRows, toQueueItem } from '@/src/audio/queue';
import { attachAudio } from '@/src/audio/importer';
import { qualityLabel } from '@/src/audio/formats';
import { deleteFileSafe } from '@/src/services/files';
import { fmtTime, toFa } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';

function Action({ icon, label, onPress, danger }: { icon: any; label: string; onPress: () => void; danger?: boolean }) {
  return (
    <Pressy onPress={onPress} scaleTo={0.98} style={[row, { paddingHorizontal: 24, paddingVertical: 13 }]}>
      <Feather name={icon} size={18} color={danger ? C.danger : C.dim} />
      <Txt v="h3" color={danger ? C.danger : C.text} style={{ marginRight: 16, fontSize: 14.5 }}>{label}</Txt>
    </Pressy>
  );
}

export default function RecordingSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rec = useData(() => getRecording(id), [id]);
  const cols = useData(() => listCollections(), []);
  const inCols = useData(() => collectionsOf(id), [id]);
  const [showCols, setShowCols] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const r = rec.data;
  if (!r) return <Sheet><View style={{ height: 120 }} /></Sheet>;

  const pickAudio = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    try {
      setBusy('در حال آماده‌سازی فایل…');
      const old = r.audioUri;
      await attachAudio(r.id, r.title, { uri: a.uri, name: a.name, size: a.size }, (p) => setBusy(`تبدیل · ${toFa(Math.round(p * 100))}٪`));
      forgetLoaded(r.id);
      if (old) deleteFileSafe(old);
      setBusy(null);
      router.back();
    } catch (e: any) {
      setBusy(null);
      Alert.alert('فایل اضافه نشد', e?.message ?? '');
    }
  };

  const remove = () =>
    Alert.alert('حذف قطعه', `«${r.title}» و فایل صوتی‌اش از آرشیو حذف شود؟`, [
      { text: 'انصراف', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => unravel(async () => {
          if (currentItem(usePlayer.getState())?.id === r.id) await stopPlayback();
          forgetLoaded(r.id);
          deleteFileSafe(r.audioUri);
          await deleteRecording(r.id);
          router.back();
        }),
      },
    ]);

  return (
    <Sheet>
      <ScrollView>
        <View style={[row, { paddingHorizontal: 22, paddingBottom: 14 }]}>
          <Cover uri={recCover(r)} size={58} radius={14} seed={r.id} />
          <View style={{ flex: 1, marginRight: 14 }}>
            <Txt v="h3" numberOfLines={2}>{r.title}</Txt>
            <Txt v="small" numberOfLines={1}>{recArtistLine(r) || r.albumTitle || ''}</Txt>
            <Txt v="caption" color={C.faint}>{[qualityLabel(r), r.duration ? fmtTime(r.duration) : null].filter(Boolean).join(' · ')}</Txt>
          </View>
        </View>
        <Divider />
        {busy ? <Txt v="small" center color={C.accent} style={{ padding: 14 }}>{busy}</Txt> : null}
        {r.audioUri ? (
          <>
            <Action icon="play" label="پخش" onPress={() => { playRows([r]); router.back(); }} />
            <Action icon="corner-down-left" label="پخش بعد از قطعهٔ فعلی" onPress={() => { const q = toQueueItem(r); if (q) playNext(q); router.back(); }} />
          </>
        ) : null}
        <Action icon={r.audioUri ? 'refresh-cw' : 'upload'} label={r.audioUri ? 'جایگزینی فایل صوتی' : 'افزودن فایل صوتی'} onPress={pickAudio} />
        <Action icon="image" label="ساختن کارت‌پستال" onPress={() => { router.back(); router.push({ pathname: '/postcard', params: { rec: r.id } }); }} />
        <Action icon="edit-2" label="ویرایش اطلاعات و متن" onPress={() => { router.back(); router.push({ pathname: '/edit/recording', params: { id: r.id } }); }} />
        {r.workId ? <Action icon="feather" label={`اثر: ${r.workTitle ?? ''}`} onPress={() => { router.back(); router.push(`/work/${r.workId}`); }} /> : null}
        {r.albumId ? <Action icon="disc" label={`آلبوم: ${r.albumTitle ?? ''}`} onPress={() => { router.back(); router.push(`/album/${r.albumId}`); }} /> : null}
        <Action icon="list" label="افزودن به مجموعه" onPress={() => setShowCols((v) => !v)} />
        {showCols ? (
          <Animated.View entering={FadeInDown} style={{ paddingHorizontal: 24, paddingBottom: 8 }}>
            {(cols.data ?? []).map((c) => {
              const inside = inCols.data?.includes(c.id);
              return (
                <Pressy key={c.id} onPress={async () => { inside ? await removeFromCollection(c.id, r.id) : await addToCollection(c.id, r.id); inCols.reload(); }} style={[row, { paddingVertical: 9, paddingRight: 30 }]} scaleTo={0.98}>
                  <Feather name={inside ? 'check-circle' : 'circle'} size={16} color={inside ? C.accent : C.faint} />
                  <Txt v="small" color={C.text} style={{ marginRight: 12 }}>{c.title}</Txt>
                </Pressy>
              );
            })}
            <Pressy
              onPress={async () => {
                const cid = await saveCollection({ title: `مجموعهٔ ${toFa((cols.data?.length ?? 0) + 1)}` });
                await addToCollection(cid, r.id);
                cols.reload();
                inCols.reload();
              }}
              style={[row, { paddingVertical: 9, paddingRight: 30 }]}
              scaleTo={0.98}
            >
              <Feather name="plus" size={16} color={C.accent} />
              <Txt v="small" color={C.accent} style={{ marginRight: 12 }}>مجموعهٔ تازه</Txt>
            </Pressy>
          </Animated.View>
        ) : null}
        <Action icon="book-open" label="نوشتن یادداشت" onPress={() => { router.back(); router.push({ pathname: '/journal', params: { recordingId: r.id, compose: '1' } }); }} />
        {r.originalName ? <Txt v="caption" color={C.faint} style={{ paddingHorizontal: 24, paddingTop: 6 }} left>{r.originalName}</Txt> : null}
        <Divider style={{ marginVertical: 8 }} />
        <Action icon="trash-2" label="حذف از آرشیو" danger onPress={remove} />
      </ScrollView>
    </Sheet>
  );
}
