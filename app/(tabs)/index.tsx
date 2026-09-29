import React, { useMemo } from 'react';
import { FlatList, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, traditionColor, traditionLabel } from '@/src/theme';
import { Ambient } from '@/src/ui/Ambient';
import { Txt } from '@/src/ui/Txt';
import { Card, IconBtn, Pressy, row, Section, Button, Badge } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { useData } from '@/src/hooks/useData';
import { favorites, listArtists, listJournal, listeningStats, recentlyPlayed, recArtistLine, recCover, listRecordings } from '@/src/db/repo';
import { usePlayer, currentItem, togglePlay } from '@/src/audio/player';
import { playRows } from '@/src/audio/queue';
import { fmtMinutes, greeting, relTime, yearsLabel } from '@/src/utils';
import { jalaliLabel } from '@/src/calendar';
import { Doily, LaceEdge, OrnamentDivider } from '@/src/motifs/Ornament';
import { Spin, unfold } from '@/src/ui/motion';
import { ForYou } from '@/src/ui/ForYou';
import { SoundDoily } from '@/src/motifs/SoundDoily';
import { verseOfDay } from '@/src/services/verses';
import { useMood } from '@/src/mood';
import { Emblem } from '@/src/motifs/Emblem';

function Breath({ size }: { size: number }) {
  const t = useSharedValue(0);
  React.useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 4200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: 0.94 + t.value * 0.08 }], opacity: 0.35 + t.value * 0.3 }));
  return <Animated.View style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: C.accent }, a]} />;
}

function NowCard() {
  const item = usePlayer((s) => currentItem(s));
  const playing = usePlayer((s) => s.playing);
  const { width } = useWindowDimensions();
  if (!item) return null;
  const h = 210;
  return (
    <Animated.View entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 18, marginTop: 22 }}>
      <Pressy onPress={() => router.push('/player')} scaleTo={0.985}>
        <Card style={{ height: h }}>
          {item.cover ? <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFill} blurRadius={40} contentFit="cover" /> : null}
          <LinearGradient colors={['rgba(11,11,12,0.25)', 'rgba(11,11,12,0.85)']} style={StyleSheet.absoluteFill} />
          <View style={[row, { flex: 1, padding: 18 }]}>
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Breath size={Math.min(150, width * 0.36) + 18} />
              <View style={{ position: 'absolute' }}><SoundDoily size={Math.min(150, width * 0.36) + 70} seed={item.id} /></View>
              <Cover uri={item.cover} size={Math.min(150, width * 0.36)} radius={75} seed={item.id} />
            </View>
            <View style={{ flex: 1, marginRight: 18 }}>
              <Txt v="label" color={C.zar}>{playing ? 'در حال پخش' : 'ادامهٔ شنیدن'}</Txt>
              <Txt v="h2" numberOfLines={2} style={{ marginTop: 6 }}>{item.title}</Txt>
              <Txt v="small" numberOfLines={1}>{item.artist}</Txt>
              <Pressy onPress={() => void togglePlay()} style={styles.playBig} scaleTo={0.9}>
                <Feather name={playing ? 'pause' : 'play'} size={22} color="#141312" />
              </Pressy>
            </View>
          </View>
        </Card>
      </Pressy>
    </Animated.View>
  );
}

/** «بیتِ روز»: a couplet from Hafez, Saadi or Khayyam, in nastaliq, changing with the Iranian calendar. */
function VerseCard() {
  const festival = useMood((s) => s.festival);
  const v = useMemo(() => verseOfDay(), [festival?.key]);
  const { width } = useWindowDimensions();
  return (
    <Animated.View entering={unfold(250, 1000)} style={{ paddingHorizontal: 18, marginTop: 18 }}>
      <Card style={{ paddingVertical: 16, paddingHorizontal: 18, backgroundColor: 'rgba(210,161,95,0.06)' }}>
        <View style={[row, { justifyContent: 'space-between' }]}>
          <Txt v="label" color={C.zar}>بیتِ روز</Txt>
          <Txt v="caption" color={C.faint}>{v.poet}</Txt>
        </View>
        <Txt center style={styles.verse}>{v.a}</Txt>
        <Txt center style={[styles.verse, { marginTop: -6 }]}>{v.b}</Txt>
        <OrnamentDivider width={Math.min(180, width - 80)} style={{ alignSelf: 'center', marginTop: 4 }} />
      </Card>
    </Animated.View>
  );
}

export default function Listen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const recent = useData(() => recentlyPlayed(16), []);
  const favs = useData(() => favorites(), []);
  const all = useData(() => listRecordings(), []);
  const artists = useData(() => listArtists(), []);
  const notes = useData(() => listJournal(), []);
  const stats = useData(() => listeningStats(), []);
  const hasItem = usePlayer((s) => !!currentItem(s));
  const festival = useMood((s) => s.festival);

  const spotlight = useMemo(() => {
    const list = artists.data ?? [];
    if (!list.length) return null;
    const day = Math.floor(Date.now() / 86400000);
    return list[day % list.length];
  }, [artists.data]);

  const tile = Math.min(150, (width - 60) / 2.4);
  const empty = !all.loading && !(all.data?.length);

  return (
    <View style={{ flex: 1 }}>
      <Ambient />
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 200 }} showsVerticalScrollIndicator={false}>
        <Spin period={180000} style={{ position: 'absolute', top: insets.top - 90, right: -110 }}>
          <Doily size={300} seed="home" opacity={0.28} fill={0.1} />
        </Spin>
        <Animated.View entering={unfold(0, 900)} style={[row, { paddingHorizontal: 22, justifyContent: 'space-between' }]}>
          <View>
            <Txt v="small" color={C.dim}>{`${greeting()} · ${jalaliLabel()}`}</Txt>
            <Txt v="display">نغمه</Txt>
            {festival ? (
              <Animated.View entering={FadeIn.duration(1200)} style={[row, { gap: 6, marginTop: 2 }]}>
                <Emblem kind={festival.emblem} size={22} color={festival.tint} accent={festival.second} />
                <Txt v="small" color={festival.tint}>{festival.line}</Txt>
              </Animated.View>
            ) : null}
          </View>
          <View style={[row, { gap: 2 }]}>
            <IconBtn name="plus" onPress={() => router.push('/add')} filled label="افزودن" />
            <IconBtn name="settings" onPress={() => router.push('/settings')} label="تنظیمات" />
          </View>
        </Animated.View>

        <LaceEdge width={width} height={18} opacity={0.35} style={{ marginTop: 14 }} />

        <VerseCard />

        {hasItem ? <NowCard /> : null}

        {empty ? (
          <Animated.View entering={FadeInDown.duration(700)} style={{ paddingHorizontal: 18, marginTop: 26 }}>
            <Card style={{ padding: 22 }}>
              <Txt v="h2">آرشیو صوتی‌ات را بساز</Txt>
              <Txt v="small" style={{ marginTop: 6 }}>
                فایل‌های FLAC، WAV، MP3، ALAC و حتی DSD سونی را وارد کن. نغمه اطلاعات داخل فایل را می‌خواند و هنرمند، اثر و آلبوم را خودش می‌سازد.
              </Txt>
              <Button label="وارد کردن موسیقی" icon="download" onPress={() => router.push('/import')} style={{ marginTop: 18, alignSelf: 'flex-end' }} />
            </Card>
          </Animated.View>
        ) : null}

        {recent.data?.length ? (
          <Section title="دوباره بشنو">
            <FlatList
              horizontal
              inverted
              data={recent.data}
              keyExtractor={(r) => r.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInDown.delay(index * 40).duration(420)} style={{ width: tile }}>
                  <Pressy onPress={() => playRows(recent.data!, item.id)} scaleTo={0.96}>
                    <Cover uri={recCover(item)} size={tile} radius={18} seed={item.id} />
                    <Txt v="h3" numberOfLines={1} style={{ marginTop: 8, fontSize: 13.5 }}>{item.title}</Txt>
                    <Txt v="caption" numberOfLines={1}>{recArtistLine(item)}</Txt>
                  </Pressy>
                </Animated.View>
              )}
            />
          </Section>
        ) : null}

        <ForYou />

        {favs.data?.length ? (
          <Section title="برگزیده‌ها" action="پخش همه" onAction={() => playRows(favs.data!)}>
            <FlatList
              horizontal
              inverted
              data={favs.data}
              keyExtractor={(r) => r.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}
              renderItem={({ item }) => (
                <Pressy onPress={() => playRows(favs.data!, item.id)} style={[row, styles.favPill]} scaleTo={0.96}>
                  <Cover uri={recCover(item)} size={40} radius={20} seed={item.id} />
                  <View style={{ marginHorizontal: 10, maxWidth: 150 }}>
                    <Txt v="small" color={C.text} numberOfLines={1}>{item.title}</Txt>
                    <Txt v="caption" numberOfLines={1}>{recArtistLine(item)}</Txt>
                  </View>
                </Pressy>
              )}
            />
          </Section>
        ) : null}

        {spotlight ? (
          <Section title="هنرمند امروز">
            <Pressy onPress={() => router.push(`/artist/${spotlight.id}`)} scaleTo={0.985} style={{ paddingHorizontal: 18 }}>
              <Card style={{ height: 180 }}>
                {spotlight.photo ? <Image source={{ uri: spotlight.photo }} style={StyleSheet.absoluteFill} contentFit="cover" transition={400} /> : null}
                <LinearGradient colors={['rgba(11,11,12,0.1)', 'rgba(11,11,12,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={{ flex: 1, justifyContent: 'flex-end', padding: 18 }}>
                  <Badge label={traditionLabel(spotlight.tradition)} color={traditionColor(spotlight.tradition)} />
                  <Txt v="title" style={{ marginTop: 6 }}>{spotlight.name}</Txt>
                  <Txt v="small" numberOfLines={2}>{spotlight.bio || yearsLabel(spotlight.born, spotlight.died)}</Txt>
                </View>
              </Card>
            </Pressy>
          </Section>
        ) : null}

        <Section title="دفترچهٔ شنیدن" action="همه" onAction={() => router.push('/journal')}>
          <Pressy onPress={() => router.push('/journal')} scaleTo={0.985} style={{ paddingHorizontal: 18 }}>
            <Card style={{ padding: 18 }}>
              {notes.data?.[0] ? (
                <>
                  <Txt v="body" numberOfLines={3}>«{notes.data[0].text}»</Txt>
                  <Txt v="caption" style={{ marginTop: 8 }}>
                    {[notes.data[0].mood, notes.data[0].recordingTitle || notes.data[0].workTitle || notes.data[0].artistName, relTime(notes.data[0].createdAt)].filter(Boolean).join(' · ')}
                  </Txt>
                </>
              ) : (
                <View style={[row, { gap: 12 }]}>
                  <Feather name="feather" size={18} color={C.accent} />
                  <Txt v="small" style={{ flex: 1 }}>حس و حال هر شنیدن را همین‌جا یادداشت کن.</Txt>
                </View>
              )}
            </Card>
          </Pressy>
        </Section>

        {stats.data && stats.data.totalSeconds > 60 ? (
          <Animated.View entering={FadeIn.duration(600)} style={{ paddingHorizontal: 22, marginTop: 28 }}>
            <Txt v="caption" center>
              {`این هفته ${fmtMinutes(stats.data.weekSeconds)} شنیدی${stats.data.topArtist ? `، بیشتر از همه ${stats.data.topArtist}` : ''}.`}
            </Txt>
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  verse: { fontFamily: F.nastaliq, fontSize: 16, lineHeight: 46, color: C.text },
  playBig: { marginTop: 16, width: 50, height: 50, borderRadius: 25, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  favPill: { backgroundColor: C.surface, borderRadius: 999, padding: 5, paddingLeft: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
});
