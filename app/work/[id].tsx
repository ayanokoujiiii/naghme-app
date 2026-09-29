import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { C, roleLabel, traditionColor, traditionLabel } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Badge, Button, Card, Chip, Empty, Header, IconBtn, Loading, Pressy, row, Section } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { ArtistChip, RecordingItem, workMeta } from '@/src/ui/rows';
import { useData } from '@/src/hooks/useData';
import { creditsFor, deleteWork, getWork, listJournal, workRecordings } from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { parseList, relTime, toFa } from '@/src/utils';
import { parseLyrics } from '@/src/ui/lyrics';
import { Doily, Toranj } from '@/src/motifs/Ornament';
import { LaceCurtain, unfold } from '@/src/ui/motion';
import { unravel } from '@/src/ui/Unravel';

export default function WorkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const [tab, setTab] = useState<'lyrics' | 'sheet' | 'about'>('lyrics');
  const w = useData(() => getWork(id), [id]);
  const recs = useData(() => workRecordings(id), [id]);
  const credits = useData(() => creditsFor({ workId: id }), [id]);
  const notes = useData(() => listJournal({ workId: id }), [id]);

  if (w.loading) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  const work = w.data;
  if (!work) return <View style={{ flex: 1, backgroundColor: C.bg }}><Empty title="این اثر پیدا نشد" action="بازگشت" onAction={() => router.back()} /></View>;

  const tint = traditionColor(work.tradition);
  const sheets = parseList(work.sheetImages);
  const lyrics = parseLyrics(work.lyrics).lines.map((l) => l.text).join('\n');
  const posterW = Math.min(width * 0.52, 230);

  const confirmDelete = () =>
    Alert.alert('حذف اثر', `«${work.title}» حذف شود؟ اجراها باقی می‌مانند.`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteWork(work.id); router.back(); }) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {work.poster ? <Image source={{ uri: work.poster }} style={[StyleSheet.absoluteFill, { opacity: 0.5 }]} blurRadius={50} contentFit="cover" /> : null}
      <LinearGradient colors={[`${tint}22`, C.bg]} locations={[0, 0.55]} style={StyleSheet.absoluteFill} />
      <Header right={<IconBtn name="edit-2" onPress={() => router.push({ pathname: '/edit/work', params: { id: work.id } })} label="ویرایش" />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <Animated.View entering={unfold(450, 900)} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
          <Toranj width={posterW * 1.9} height={posterW * 1.9} opacity={0.22} style={{ position: 'absolute', top: -posterW * 0.3 }} />
          <Pressy onPress={() => work.poster && router.push({ pathname: '/viewer', params: { images: JSON.stringify([work.poster]), index: '0' } })} scaleTo={0.97} style={styles.posterShadow}>
            <Cover uri={work.poster} size={posterW} radius={22} seed={work.id} icon="feather" tint={tint} style={{ width: posterW, height: posterW * 1.25 }} />
            {/* a crocheted doily laid over the corner of the poster, like on grandmother's picture frames */}
            <View style={{ position: 'absolute', top: -34, right: -34, width: 110, height: 110 }} pointerEvents="none">
              <Doily size={110} seed={work.id} color="#EFE3CC" opacity={0.85} fill={0.3} />
            </View>
          </Pressy>
          <View style={[row, { gap: 6, marginTop: 20 }]}>
            <Badge label={traditionLabel(work.tradition)} color={tint} />
            {work.form ? <Badge label={work.form} color={C.dim} /> : null}
          </View>
          <Txt v="title" center style={{ marginTop: 10, fontSize: 26 }}>{work.title}</Txt>
          {work.titleLatin ? <Txt v="latin" center>{work.titleLatin}</Txt> : null}
          <Txt v="small" center style={{ marginTop: 6 }}>{workMeta({ ...work, form: null })}</Txt>
          {work.gousheh ? <Txt v="caption" center>{`گوشه‌ها: ${work.gousheh}`}</Txt> : null}
          <View style={[row, { gap: 10, marginTop: 18 }]}>
            <Button label={recs.data?.length ? `پخش · ${toFa(recs.data.length)} اجرا` : 'بدون اجرا'} icon="play" disabled={!recs.data?.some((r) => r.audioUri)} onPress={() => playRows(recs.data!)} />
          </View>
        </Animated.View>

        {credits.data?.length ? (
          <Section title="پدیدآورندگان">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }] }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
              {credits.data.map((c) => (
                <View key={c.id} style={{ transform: [{ scaleX: -1 }] }}>
                  <ArtistChip a={{ id: c.artistId, name: c.artistName ?? '', photo: c.artistPhoto }} sub={c.instrument || roleLabel(c.role)} />
                </View>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        <Section title={`اجراها و نسخه‌ها · ${toFa(recs.data?.length ?? 0)}`}>
          {recs.data?.length ? recs.data.map((r, i) => <RecordingItem key={r.id} r={r} index={i} onPlay={() => playRows(recs.data!, r.id)} />) : (
            <Txt v="small" style={{ paddingHorizontal: 22 }}>هر اجرای تازه از این اثر (با خواننده یا نوازندهٔ دیگر) را همین‌جا کنار هم نگه دار.</Txt>
          )}
        </Section>

        <View style={[row, { gap: 8, paddingHorizontal: 18, marginTop: 30 }]}>
          <Chip label="متن و شعر" active={tab === 'lyrics'} onPress={() => setTab('lyrics')} />
          <Chip label={`نت${sheets.length ? ` · ${toFa(sheets.length)}` : ''}`} active={tab === 'sheet'} onPress={() => setTab('sheet')} />
          <Chip label="دربارهٔ اثر" active={tab === 'about'} onPress={() => setTab('about')} />
        </View>
        <Animated.View key={tab} entering={FadeIn.duration(350)}>
          <Card style={{ marginHorizontal: 16, marginTop: 12, padding: 20 }}>
            {tab === 'lyrics' ? (
              lyrics ? <Txt v="body" center style={{ lineHeight: 32 }}>{lyrics}</Txt> : <Txt v="small" center>متنی ثبت نشده.</Txt>
            ) : tab === 'sheet' ? (
              <>
                {sheets.length ? (
                  <View style={[row, { flexWrap: 'wrap', gap: 10 }]}>
                    {sheets.map((u, i) => (
                      <Pressy key={u} onPress={() => router.push({ pathname: '/viewer', params: { images: JSON.stringify(sheets), index: String(i) } })} scaleTo={0.97}>
                        <Cover uri={u} size={(width - 32 - 40 - 10) / 2} radius={12} style={{ backgroundColor: '#F4F1EA' }} />
                      </Pressy>
                    ))}
                  </View>
                ) : null}
                {work.sheetText ? <Txt v="body" left style={{ marginTop: sheets.length ? 16 : 0, fontSize: 13.5, lineHeight: 24 }}>{work.sheetText}</Txt> : null}
                {!sheets.length && !work.sheetText ? <Txt v="small" center>تصویر نت یا نت‌نویسی متنی را از ویرایش اثر اضافه کن.</Txt> : null}
              </>
            ) : (
              work.description ? <Txt v="body">{work.description}</Txt> : <Txt v="small" center>توضیحی ثبت نشده.</Txt>
            )}
          </Card>
        </Animated.View>

        <Section title="یادداشت‌ها" action="نوشتن" onAction={() => router.push({ pathname: '/journal', params: { workId: work.id, compose: '1' } })}>
          {notes.data?.length ? notes.data.slice(0, 4).map((n) => (
            <Card key={n.id} soft style={{ marginHorizontal: 18, marginBottom: 10, padding: 14 }}>
              <Txt v="body">{n.text}</Txt>
              <Txt v="caption" style={{ marginTop: 6 }}>{[n.mood, relTime(n.createdAt)].filter(Boolean).join(' · ')}</Txt>
            </Card>
          )) : <Txt v="small" style={{ paddingHorizontal: 22 }}>هنوز یادداشتی نیست.</Txt>}
        </Section>

        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Chip label="حذف اثر" icon="trash-2" onPress={confirmDelete} />
        </View>
      </ScrollView>
      <LaceCurtain delay={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  posterShadow: { shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 18, borderRadius: 22 },
});
