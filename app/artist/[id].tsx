import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, interpolate, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, Extrapolation } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, relationLabel, traditionColor, traditionLabel } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Badge, Button, Card, Chip, Empty, IconBtn, Loading, Pressy, row, Section } from '@/src/ui/kit';
import { Avatar, Cover } from '@/src/ui/Media';
import { AlbumTile, ArtistChip, RecordingItem, WorkItem } from '@/src/ui/rows';
import { useData } from '@/src/hooks/useData';
import {
  artistAlbums, artistRecordings, artistRelations, artistTimeline, artistWorks, deleteArtist, getArtist, galleryOf, listJournal, removeRelation, removeTimeline,
} from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { Doily, LaceEdge } from '@/src/motifs/Ornament';
import { MiniatureFrame } from '@/src/motifs/MiniatureFrame';
import { LaceCurtain, Spin, unfold } from '@/src/ui/motion';
import { relTime, toFa, yearsLabel } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';

const HERO = 420;

export default function ArtistScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [bioOpen, setBioOpen] = useState(false);
  const a = useData(() => getArtist(id), [id]);
  const works = useData(() => artistWorks(id), [id]);
  const recs = useData(() => artistRecordings(id), [id]);
  const albums = useData(() => artistAlbums(id), [id]);
  const rels = useData(() => artistRelations(id), [id]);
  const tl = useData(() => artistTimeline(id), [id]);
  const notes = useData(() => listJournal({ artistId: id }), [id]);

  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.value = e.contentOffset.y; });
  const heroStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(y.value, [-200, 0, HERO], [-100, 0, HERO * 0.45], Extrapolation.CLAMP) },
      { scale: interpolate(y.value, [-200, 0], [1.4, 1], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(y.value, [0, HERO * 0.9], [1, 0.2], Extrapolation.CLAMP),
  }));
  const barStyle = useAnimatedStyle(() => ({ opacity: interpolate(y.value, [HERO - 140, HERO - 60], [0, 1], Extrapolation.CLAMP) }));

  if (a.loading) return <View style={{ flex: 1, backgroundColor: C.bg }}><Loading /></View>;
  const artist = a.data;
  if (!artist) return <View style={{ flex: 1, backgroundColor: C.bg }}><Empty icon="user" title="این هنرمند پیدا نشد" action="بازگشت" onAction={() => router.back()} /></View>;

  const gallery = galleryOf(artist);
  const tint = traditionColor(artist.tradition);
  const heroImg = artist.cover || artist.photo;
  const gw = (width - 36 - 10) / 2;

  const confirmDelete = () =>
    Alert.alert('حذف هنرمند', `«${artist.name}» و پیوندهایش حذف شود؟ آثار و قطعه‌ها باقی می‌مانند.`, [
      { text: 'انصراف', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteArtist(artist.id); router.back(); }) },
    ]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Animated.View style={[{ position: 'absolute', top: 0, left: 0, right: 0, height: HERO }, heroStyle]}>
        {heroImg ? <Image source={{ uri: heroImg }} style={StyleSheet.absoluteFill} contentFit="cover" transition={500} /> : (
          <LinearGradient colors={[`${tint}55`, C.bg]} style={StyleSheet.absoluteFill} />
        )}
        <LinearGradient colors={['rgba(11,11,12,0.2)', 'rgba(11,11,12,0.5)', C.bg]} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
        <LaceEdge width={width} height={20} opacity={0.5} style={{ position: 'absolute', top: 0 }} />
      </Animated.View>

      <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentContainerStyle={{ paddingBottom: 160 }} showsVerticalScrollIndicator={false}>
        <View style={{ height: HERO - 150 }} />
        <Animated.View entering={unfold(500, 900)} style={{ paddingHorizontal: 22 }}>
          <View style={[row, { alignItems: 'flex-end' }]}>
            <View style={{ width: 124, height: 124, alignItems: 'center', justifyContent: 'center' }}>
              <Spin period={140000} style={{ position: 'absolute' }}>
                <Doily size={176} seed={artist.id} color={C.zar} fill={0.16} />
              </Spin>
              <MiniatureFrame size={124} inner={86}>
                <Avatar uri={artist.photo} name={artist.name} size={86} ring={C.zar} />
              </MiniatureFrame>
            </View>
            <View style={{ flex: 1, marginRight: 16 }}>
              <Badge label={traditionLabel(artist.tradition)} color={tint} />
              <Txt v="display" style={{ fontSize: 30, lineHeight: 44, marginTop: 4 }}>{artist.name}</Txt>
              {artist.nameLatin ? <Txt v="latin" left style={{ textAlign: 'right' }}>{artist.nameLatin}</Txt> : null}
            </View>
          </View>
          <Txt v="small" style={{ marginTop: 10 }}>{[yearsLabel(artist.born, artist.died), artist.instruments].filter(Boolean).join(' · ')}</Txt>
          <View style={[row, { gap: 10, marginTop: 18 }]}>
            <Button label="پخش" icon="play" onPress={() => recs.data && playRows(recs.data)} disabled={!recs.data?.some((r) => r.audioUri)} />
            <Button label="در کهکشان" icon="aperture" kind="ghost" onPress={() => router.navigate({ pathname: '/galaxy', params: { focus: artist.id } })} />
            <IconBtn name="edit-2" filled onPress={() => router.push({ pathname: '/edit/artist', params: { id: artist.id } })} label="ویرایش" />
          </View>
        </Animated.View>

        {artist.bio ? (
          <Section title="زندگی‌نامه">
            <Pressy onPress={() => setBioOpen((v) => !v)} haptic={false} scaleTo={0.995} style={{ paddingHorizontal: 22 }}>
              <Txt v="body" numberOfLines={bioOpen ? undefined : 5} style={{ lineHeight: 28 }}>{artist.bio}</Txt>
              <Txt v="small" color={C.accent} style={{ marginTop: 6 }}>{bioOpen ? 'کمتر' : 'ادامه'}</Txt>
            </Pressy>
            {artist.source ? <Txt v="caption" style={{ paddingHorizontal: 22, marginTop: 4 }}>{`منبع: ${artist.source}`}</Txt> : null}
          </Section>
        ) : null}

        {gallery.length ? (
          <Section title={`نگارخانه · ${toFa(gallery.length)}`}>
            <View style={[row, { flexWrap: 'wrap', gap: 10, paddingHorizontal: 18 }]}>
              {gallery.slice(0, 6).map((u, i) => (
                <Animated.View key={u} entering={FadeIn.delay(i * 60)}>
                  <Pressy onPress={() => router.push({ pathname: '/viewer', params: { images: JSON.stringify(gallery), index: String(i) } })} scaleTo={0.97}>
                    <Cover uri={u} size={i === 0 ? width - 36 : gw} radius={18} style={i === 0 ? { width: width - 36, height: 220 } : undefined} />
                  </Pressy>
                </Animated.View>
              ))}
            </View>
          </Section>
        ) : null}

        <Section title="پیوندها" action="افزودن" onAction={() => router.push({ pathname: '/edit/relation', params: { artistId: artist.id } })}>
          {rels.data?.length ? (
            <View style={[row, { flexWrap: 'wrap', gap: 8, paddingHorizontal: 18 }]}>
              {rels.data.map((r) => (
                <Pressy
                  key={r.id}
                  onPress={() => router.push(`/artist/${r.otherId}`)}
                  onLongPress={() => Alert.alert('حذف پیوند', `پیوند با «${r.otherName}» حذف شود؟`, [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(() => void removeRelation(r.id)) }])}
                  style={[row, styles.rel]}
                  scaleTo={0.95}
                >
                  <Avatar uri={r.otherPhoto} name={r.otherName} size={30} />
                  <View style={{ marginRight: 8, marginLeft: 6 }}>
                    <Txt v="caption" color={C.faint}>{relationLabel(r.kind, r.outgoing)}</Txt>
                    <Txt v="small" color={C.text}>{r.otherName}</Txt>
                  </View>
                </Pressy>
              ))}
            </View>
          ) : (
            <Txt v="small" style={{ paddingHorizontal: 22 }}>استاد، شاگرد، همکار یا اثرپذیری‌ها را اضافه کن تا در کهکشان به هم وصل شوند.</Txt>
          )}
        </Section>

        {works.data?.length ? (
          <Section title={`آثار · ${toFa(works.data.length)}`}>
            {works.data.slice(0, 12).map((w, i) => <WorkItem key={w.id} w={w} index={i} />)}
          </Section>
        ) : null}

        {recs.data?.length ? (
          <Section title={`اجراها · ${toFa(recs.data.length)}`} action="پخش همه" onAction={() => playRows(recs.data!)}>
            {recs.data.slice(0, 20).map((r, i) => <RecordingItem key={r.id} r={r} index={i} onPlay={() => playRows(recs.data!, r.id)} />)}
          </Section>
        ) : null}

        {albums.data?.length ? (
          <Section title="آلبوم‌ها">
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }] }} contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}>
              {albums.data.map((al) => (
                <View key={al.id} style={{ transform: [{ scaleX: -1 }] }}><AlbumTile al={al} width={130} /></View>
              ))}
            </ScrollView>
          </Section>
        ) : null}

        <Section title="گاه‌شمار" action="رویداد تازه" onAction={() => router.push({ pathname: '/edit/timeline', params: { artistId: artist.id } })}>
          {tl.data?.length ? (
            <View style={{ paddingHorizontal: 22 }}>
              {tl.data.map((e, i) => (
                <Pressy key={e.id} haptic={false} scaleTo={0.99} onLongPress={() => Alert.alert('حذف رویداد', e.title, [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(() => void removeTimeline(e.id)) }])} style={[row, { alignItems: 'flex-start' }]}>
                  <View style={{ alignItems: 'center', width: 18 }}>
                    <View style={[styles.tlDot, { backgroundColor: tint }]} />
                    {i < tl.data!.length - 1 ? <View style={styles.tlLine} /> : null}
                  </View>
                  <View style={{ flex: 1, marginRight: 12, paddingBottom: 18 }}>
                    <Txt v="caption" color={tint}>{toFa(e.date) || '·'}</Txt>
                    <Txt v="h3">{e.title}</Txt>
                    {e.description ? <Txt v="small">{e.description}</Txt> : null}
                  </View>
                </Pressy>
              ))}
            </View>
          ) : (
            <Txt v="small" style={{ paddingHorizontal: 22 }}>لحظه‌های مهم زندگی هنری را روی یک خط زمانی آرام بچین.</Txt>
          )}
        </Section>

        <Section title="یادداشت‌ها" action="نوشتن" onAction={() => router.push({ pathname: '/journal', params: { artistId: artist.id, compose: '1' } })}>
          {notes.data?.length ? notes.data.slice(0, 4).map((n) => (
            <Card key={n.id} soft style={{ marginHorizontal: 18, marginBottom: 10, padding: 14 }}>
              <Txt v="body">{n.text}</Txt>
              <Txt v="caption" style={{ marginTop: 6 }}>{[n.mood, relTime(n.createdAt)].filter(Boolean).join(' · ')}</Txt>
            </Card>
          )) : <Txt v="small" style={{ paddingHorizontal: 22 }}>هنوز یادداشتی نیست.</Txt>}
        </Section>

        <View style={{ alignItems: 'center', marginTop: 40 }}>
          <Chip label="حذف هنرمند" icon="trash-2" onPress={confirmDelete} />
        </View>
      </Animated.ScrollView>

      <Animated.View style={[styles.bar, { paddingTop: insets.top }, barStyle]} pointerEvents="none">
        <Txt v="h3" center>{artist.name}</Txt>
      </Animated.View>
      <View style={[styles.back, { top: insets.top + 6 }]}>
        <IconBtn name="chevron-right" size={24} filled onPress={() => router.back()} label="بازگشت" />
      </View>
      <LaceCurtain />
    </View>
  );
}

const styles = StyleSheet.create({
  rel: { backgroundColor: C.surface, borderRadius: 999, padding: 5, paddingLeft: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
  tlDot: { width: 9, height: 9, borderRadius: 5, marginTop: 7 },
  tlLine: { width: 1, flex: 1, backgroundColor: C.line, marginTop: 4 },
  bar: { position: 'absolute', top: 0, left: 0, right: 0, height: 96, justifyContent: 'center', backgroundColor: 'rgba(11,11,12,0.92)' },
  back: { position: 'absolute', right: 14 },
});
