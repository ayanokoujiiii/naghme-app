import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { C, F, MOODS } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Card, Chip, Empty, Header, IconBtn, Loading, Pressy, row } from '@/src/ui/kit';
import { Ambient } from '@/src/ui/Ambient';
import { useData } from '@/src/hooks/useData';
import { addJournal, getArtist, getRecording, getWork, listJournal, removeJournal } from '@/src/db/repo';
import { relTime } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';
import { tr } from '@/src/i18n';

export default function JournalScreen() {
  const p = useLocalSearchParams<{ compose?: string; recordingId?: string; workId?: string; artistId?: string }>();
  const filter = { recordingId: p.recordingId, workId: p.workId, artistId: p.artistId };
  const scoped = !!(p.recordingId || p.workId || p.artistId);
  const list = useData(() => listJournal(scoped ? filter : undefined), [p.recordingId, p.workId, p.artistId]);
  const ctx = useData(async () => {
    if (p.recordingId) return (await getRecording(p.recordingId))?.title ?? null;
    if (p.workId) return (await getWork(p.workId))?.title ?? null;
    if (p.artistId) return (await getArtist(p.artistId))?.name ?? null;
    return null;
  }, [p.recordingId, p.workId, p.artistId]);
  const [open, setOpen] = useState(!!p.compose);
  const [text, setText] = useState('');
  const [mood, setMood] = useState<string | null>(null);

  const save = async () => {
    if (!text.trim()) return;
    await addJournal({ text: text.trim(), mood, recordingId: p.recordingId ?? null, workId: p.workId ?? null, artistId: p.artistId ?? null });
    setText('');
    setMood(null);
    setOpen(false);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Ambient intensity={0.6} />
      <Header title="یادداشت‌ها" subtitle={ctx.data ?? 'دفتر شنیدن'} right={!open ? <IconBtn name="plus" onPress={() => setOpen(true)} /> : undefined} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        {open ? (
          <Animated.View entering={FadeInDown.duration(350)} exiting={FadeOut}>
            <Card style={{ padding: 16, marginBottom: 18 }}>
              <TextInput
                value={text}
                onChangeText={setText}
                autoFocus
                multiline
                placeholder={tr("این شنیدن چه حسی داشت؟")}
                placeholderTextColor={C.faint}
                style={{ minHeight: 120, color: C.text, fontFamily: F.regular, fontSize: 15, lineHeight: 28, textAlign: 'right', writingDirection: 'rtl', textAlignVertical: 'top' }}
              />
              <View style={[row, { flexWrap: 'wrap', gap: 8, marginTop: 10 }]}>
                {MOODS.map((m) => <Chip key={m} label={m} active={mood === m} onPress={() => setMood(mood === m ? null : m)} />)}
              </View>
              <View style={[row, { gap: 10, marginTop: 16 }]}>
                <Button label="ثبت" icon="check" onPress={save} disabled={!text.trim()} style={{ flex: 1 }} />
                <Button label="انصراف" kind="ghost" onPress={() => (p.compose && !list.data?.length ? router.back() : setOpen(false))} />
              </View>
            </Card>
          </Animated.View>
        ) : null}
        {list.loading ? <Loading /> : list.data?.length ? list.data.map((e, i) => (
          <Animated.View key={e.id} entering={FadeInDown.delay(i * 40).duration(350)} exiting={FadeOut} layout={LinearTransition}>
            <Pressy
              scaleTo={0.99}
              onLongPress={() => Alert.alert('حذف یادداشت', 'این یادداشت حذف شود؟', [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(() => removeJournal(e.id)) }])}
              style={{ paddingVertical: 16, borderBottomWidth: 0.5, borderColor: C.line }}
            >
              <View style={[row, { justifyContent: 'space-between', marginBottom: 6 }]}>
                <View style={[row, { gap: 8 }]}>
                  {e.mood ? <Txt v="label" color={C.accent}>{e.mood}</Txt> : null}
                  {e.recordingTitle || e.workTitle || e.artistName ? <Txt v="caption" numberOfLines={1}>{e.recordingTitle || e.workTitle || e.artistName}</Txt> : null}
                </View>
                <Txt v="caption">{relTime(e.createdAt)}</Txt>
              </View>
              <Txt v="body">{e.text}</Txt>
            </Pressy>
          </Animated.View>
        )) : !open ? <Empty icon="book-open" title="هنوز یادداشتی نیست" hint="حس‌وحال هر شنیدن را همین‌جا نگه دار." action="نوشتن" onAction={() => setOpen(true)} /> : null}
        {list.data?.length ? <Txt v="caption" center style={{ marginTop: 14 }}>برای حذف، روی یادداشت نگه دار.</Txt> : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
