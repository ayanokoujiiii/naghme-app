import { TermehProvider } from '@/src/motifs/Termeh';
import React, { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, DASTGAHS, F, TRADITIONS, traditionColor } from '@/src/theme';
import { Ambient } from '@/src/ui/Ambient';
import { Txt } from '@/src/ui/Txt';
import { Chip, Empty, IconBtn, Pressy, row, Loading, Section, tap } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { AlbumTile, ArtistTile, RecordingItem, WorkItem } from '@/src/ui/rows';
import { VitrineCard } from '@/src/ui/VitrineCard';
import { useData } from '@/src/hooks/useData';
import { listAlbums, listArtists, listCollections, listRecordings, listWorks } from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { matches, toFa } from '@/src/utils';
import { tr } from '@/src/i18n';
import { inDastgah } from '@/src/radif';

type Seg = 'artists' | 'works' | 'recordings' | 'albums' | 'collections';
const SEGS: { key: Seg; label: string }[] = [
  { key: 'artists', label: 'هنرمندان' },
  { key: 'works', label: 'آثار' },
  { key: 'recordings', label: 'قطعه‌ها' },
  { key: 'albums', label: 'آلبوم‌ها' },
  { key: 'collections', label: 'مجموعه‌ها' },
];

function ArchiveInner() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [seg, setSeg] = useState<Seg>('artists');
  const [trad, setTrad] = useState<string | null>(null);
  const [dastgah, setDastgah] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [vitrine, setVitrine] = useState(false);

  const artists = useData(() => listArtists(), []);
  const works = useData(() => listWorks(), []);
  const recs = useData(() => listRecordings(), []);
  const albums = useData(() => listAlbums(), []);
  const cols = useData(() => listCollections(), []);

  const byTrad = <T extends { tradition?: string }>(list: T[] | undefined) => (list ?? []).filter((x) => !trad || x.tradition === trad);

  const fArtists = useMemo(() => byTrad(artists.data).filter((a) => matches(q, a.name, a.nameLatin, a.instruments)), [artists.data, trad, q]);
  const fWorks = useMemo(
    () => byTrad(works.data).filter((w) => (!dastgah || inDastgah(w, dastgah)) && matches(q, w.title, w.titleLatin, w.composers, w.catalog, w.dastgah, w.avaz, w.gousheh, w.form)),
    [works.data, trad, q, dastgah],
  );
  const fRecs = useMemo(() => (recs.data ?? []).filter((r) => matches(q, r.title, r.performers, r.composers, r.albumTitle, r.workTitle)), [recs.data, q]);
  const fAlbums = useMemo(() => (albums.data ?? []).filter((a) => matches(q, a.title, a.artists, a.label)), [albums.data, q]);
  const fCols = useMemo(() => (cols.data ?? []).filter((c) => matches(q, c.title, c.description)), [cols.data, q]);

  const gap = 14;
  const tileW = (width - 36 - gap) / 2;
  const searching = q.trim().length > 0;

  const header = (
    <View style={{ paddingTop: insets.top + 10 }}>
      <View style={[row, { paddingHorizontal: 22, justifyContent: 'space-between' }]}>
        <Txt v="display" style={{ fontSize: 32, lineHeight: 48 }}>آرشیو</Txt>
        <View style={[row, { gap: 6 }]}>
          {seg === 'artists' || seg === 'albums' ? (
            <Chip icon={vitrine ? 'grid' : 'box'} label={vitrine ? 'نمای ساده' : 'نمایشگاه'} active={vitrine} onPress={() => { tap('select'); setVitrine(!vitrine); }} />
          ) : null}
          <IconBtn name="plus" filled onPress={() => router.push('/add')} label="افزودن" />
        </View>
      </View>
      {vitrine && (seg === 'artists' || seg === 'albums') ? (
        <Txt v="caption" color={C.zarBright} style={{ paddingHorizontal: 22, marginTop: 4 }}>حالت نمایشگاه: هر هنرمند و آلبوم مثل اثری در ویترین موزه، زیر نور نورافکن.</Txt>
      ) : null}
      <View style={[row, styles.search]}>
        <Feather name="search" size={17} color={C.faint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder={tr("هنرمند، اثر، دستگاه، شمارهٔ اپوس…")}
          placeholderTextColor={C.faint}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q ? <IconBtn name="x" size={16} color={C.dim} onPress={() => setQ('')} style={{ width: 30, height: 30 }} /> : null}
      </View>
      {!searching ? (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }] }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
            {SEGS.map((s) => (
              <View key={s.key} style={{ transform: [{ scaleX: -1 }] }}>
                <Chip label={s.label} active={seg === s.key} onPress={() => setSeg(s.key)} />
              </View>
            ))}
          </ScrollView>
          {seg === 'artists' || seg === 'works' ? (
            <Animated.View entering={FadeIn} style={[row, { paddingHorizontal: 18, gap: 8, marginTop: 10 }]}>
              <Chip label="همه" active={!trad} onPress={() => { setTrad(null); setDastgah(null); }} />
              {TRADITIONS.slice(0, 2).map((t) => (
                <Chip key={t.key} label={t.label} color={traditionColor(t.key)} active={trad === t.key} onPress={() => { setTrad(trad === t.key ? null : t.key); setDastgah(null); }} />
              ))}
            </Animated.View>
          ) : null}
          {seg === 'works' && trad === 'persian' ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }], marginTop: 10 }} contentContainerStyle={{ paddingHorizontal: 18, gap: 8 }}>
              {DASTGAHS.map((d) => (
                <View key={d} style={{ transform: [{ scaleX: -1 }] }}>
                  <Chip label={d} color={C.persian} active={dastgah === d} onPress={() => setDastgah(dastgah === d ? null : d)} />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </>
      ) : null}
      <View style={{ height: 14 }} />
    </View>
  );

  const bottomPad = 200;

  if (searching) {
    return (
      <View style={{ flex: 1 }}>
        <Ambient intensity={0.6} />
        <ScrollView contentContainerStyle={{ paddingBottom: bottomPad }} keyboardShouldPersistTaps="handled">
          {header}
          {fArtists.length ? (
            <Section title={`هنرمندان · ${toFa(fArtists.length)}`} style={{ marginTop: 0 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }] }} contentContainerStyle={{ paddingHorizontal: 18, gap: 12 }}>
                {fArtists.slice(0, 20).map((a) => (
                  <View key={a.id} style={{ transform: [{ scaleX: -1 }] }}>
                    <ArtistTile a={a} width={110} />
                  </View>
                ))}
              </ScrollView>
            </Section>
          ) : null}
          {fWorks.length ? (
            <Section title={`آثار · ${toFa(fWorks.length)}`}>
              {fWorks.slice(0, 30).map((w, i) => <WorkItem key={w.id} w={w} index={i} />)}
            </Section>
          ) : null}
          {fRecs.length ? (
            <Section title={`قطعه‌ها · ${toFa(fRecs.length)}`}>
              {fRecs.slice(0, 40).map((r, i) => <RecordingItem key={r.id} r={r} index={i} onPlay={() => playRows(fRecs, r.id)} />)}
            </Section>
          ) : null}
          {fAlbums.length ? (
            <Section title={`آلبوم‌ها · ${toFa(fAlbums.length)}`}>
              <View style={[row, { flexWrap: 'wrap', paddingHorizontal: 18, gap }]}>
                {fAlbums.slice(0, 12).map((a, i) => <AlbumTile key={a.id} al={a} width={tileW} index={i} />)}
              </View>
            </Section>
          ) : null}
          {!fArtists.length && !fWorks.length && !fRecs.length && !fAlbums.length ? (
            <Empty icon="search" title="چیزی پیدا نشد" hint="املای دیگری امتحان کن، یا نام لاتین را بنویس." />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  let content: React.ReactNode = null;
  if (seg === 'artists') {
    content = artists.loading ? <Loading /> : (
      <FlatList
        key={vitrine ? 'artists-v' : 'artists'}
        data={fArtists}
        numColumns={2}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={header}
        columnWrapperStyle={{ flexDirection: 'row-reverse', gap, paddingHorizontal: 18, marginBottom: 20 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        renderItem={({ item, index }) => vitrine ? (
          <VitrineCard width={tileW} index={index}>
            <ArtistTile a={item} width={tileW - 16} index={index} />
          </VitrineCard>
        ) : (
          <ArtistTile a={item} width={tileW} index={index} />
        )}
        ListEmptyComponent={<Empty icon="user" title="هنوز هنرمندی نیست" action="افزودن هنرمند" onAction={() => router.push('/edit/artist')} />}
        showsVerticalScrollIndicator={false}
      />
    );
  } else if (seg === 'works') {
    content = (
      <FlatList
        key="works"
        data={fWorks}
        keyExtractor={(w) => w.id}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        renderItem={({ item, index }) => <WorkItem w={item} index={index} />}
        ListEmptyComponent={<Empty icon="feather" title="اثری پیدا نشد" action="افزودن اثر" onAction={() => router.push('/edit/work')} />}
        showsVerticalScrollIndicator={false}
      />
    );
  } else if (seg === 'recordings') {
    content = (
      <FlatList
        key="recs"
        data={fRecs}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={
          <>
            {header}
            {fRecs.length ? (
              <View style={[row, { paddingHorizontal: 22, gap: 10, marginBottom: 6 }]}>
                <Chip label="پخش همه" icon="play" onPress={() => playRows(fRecs)} />
                <Chip label="تصادفی" icon="shuffle" onPress={() => playRows([...fRecs].sort(() => Math.random() - 0.5))} />
              </View>
            ) : null}
          </>
        }
        contentContainerStyle={{ paddingBottom: bottomPad }}
        renderItem={({ item, index }) => <RecordingItem r={item} index={index} onPlay={() => playRows(fRecs, item.id)} />}
        ListEmptyComponent={<Empty icon="music" title="هنوز قطعه‌ای وارد نشده" action="وارد کردن موسیقی" onAction={() => router.push('/import')} />}
        showsVerticalScrollIndicator={false}
      />
    );
  } else if (seg === 'albums') {
    content = (
      <FlatList
        key={vitrine ? 'albums-v' : 'albums'}
        data={fAlbums}
        numColumns={2}
        keyExtractor={(a) => a.id}
        ListHeaderComponent={header}
        columnWrapperStyle={{ flexDirection: 'row-reverse', gap, paddingHorizontal: 18, marginBottom: 20 }}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        renderItem={({ item, index }) => vitrine ? (
          <VitrineCard width={tileW} index={index}>
            <AlbumTile al={item} width={tileW - 16} index={index} />
          </VitrineCard>
        ) : (
          <AlbumTile al={item} width={tileW} index={index} />
        )}
        ListEmptyComponent={<Empty icon="disc" title="آلبومی نیست" action="افزودن آلبوم" onAction={() => router.push('/edit/album')} />}
        showsVerticalScrollIndicator={false}
      />
    );
  } else {
    content = (
      <FlatList
        key="cols"
        data={fCols}
        keyExtractor={(c) => c.id}
        ListHeaderComponent={
          <>
            {header}
            <Pressy onPress={() => router.push('/edit/collection')} style={[row, styles.newCol]} scaleTo={0.98}>
              <Feather name="plus" size={18} color={C.accent} />
              <Txt v="h3" color={C.accent} style={{ marginRight: 10 }}>مجموعهٔ تازه</Txt>
            </Pressy>
          </>
        }
        contentContainerStyle={{ paddingBottom: bottomPad }}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 40)} layout={LinearTransition}>
            <Pressy onPress={() => router.push(`/collection/${item.id}`)} style={[row, { paddingHorizontal: 18, paddingVertical: 10 }]} scaleTo={0.98}>
              <Cover uri={item.cover} size={56} radius={14} seed={item.id} icon="list" />
              <View style={{ flex: 1, marginRight: 12 }}>
                <Txt v="h3">{item.title}</Txt>
                <Txt v="small" numberOfLines={1}>{item.description || `${toFa(item.count ?? 0)} قطعه`}</Txt>
              </View>
            </Pressy>
          </Animated.View>
        )}
        ListEmptyComponent={<Empty icon="list" title="هنوز مجموعه‌ای نساختی" hint="برای حال‌وهواهای مختلف، مجموعهٔ خودت را بساز." />}
        showsVerticalScrollIndicator={false}
      />
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* In the museum hall the lights are dimmed so the vitrines glow. */}
      <Ambient intensity={vitrine && (seg === 'artists' || seg === 'albums') ? 0.25 : 0.6} />
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    marginHorizontal: 18,
    marginTop: 12,
    marginBottom: 14,
    height: 48,
    borderRadius: 16,
    paddingHorizontal: 14,
    backgroundColor: C.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
  },
  searchInput: { flex: 1, color: C.text, fontFamily: F.regular, fontSize: 15.5, textAlign: 'right', marginRight: 10, paddingVertical: 0 },
  newCol: { marginHorizontal: 18, marginBottom: 8, padding: 16, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: C.accentSoft },
});

/** v1.1: the archive has its own cloth, the lattice (گره‌چینی). */
export default function Archive() {
  return (
    <TermehProvider pattern="gereh">
      <ArchiveInner />
    </TermehProvider>
  );
}
