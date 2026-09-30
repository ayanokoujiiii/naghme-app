import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, relationLabel, traditionColor, traditionLabel } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, IconBtn, Pressy, row, Button, Badge, tap } from '@/src/ui/kit';
import { Avatar } from '@/src/ui/Media';
import { useData } from '@/src/hooks/useData';
import { artistRecordings, galaxyData, sharedWorkLinks } from '@/src/db/repo';
import { seedStarter } from '@/src/db/seed';
import { buildGalaxy, neighborsOf } from '@/src/galaxy/layout';
import { GalaxyHandle, GalaxyView } from '@/src/galaxy/GalaxyView';
import { playRows } from '@/src/audio/queue';
import { matches, toFa, yearsLabel } from '@/src/utils';
import { tr } from '@/src/i18n';

export default function Galaxy() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ focus?: string }>();
  const g = useData(async () => ({ ...(await galaxyData()), shared: await sharedWorkLinks() }), []);
  const model = useMemo(() => buildGalaxy(g.data?.artists ?? [], g.data?.relations ?? [], g.data?.shared ?? []), [g.data]);
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<0 | 1 | 2>(0);
  const [searching, setSearching] = useState(false);
  const [q, setQ] = useState('');
  const [focused, setFocused] = useState(true);
  const view = useRef<GalaxyHandle>(null);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  const select = useCallback((i: number | null) => {
    setSelected(i);
    view.current?.focus(i);
    if (i !== null) tap('select');
  }, []);

  // Deep-link: /galaxy?focus=<artistId>
  const lastFocus = useRef<string | null>(null);
  React.useEffect(() => {
    if (!params.focus || params.focus === lastFocus.current || !model.nodes.length) return;
    const i = model.nodes.findIndex((n) => n.id === params.focus);
    if (i >= 0) {
      lastFocus.current = params.focus;
      setTimeout(() => select(i), 350);
    }
  }, [params.focus, model]);

  const labelSet = useMemo(() => {
    const byWeight = model.nodes.map((n, i) => [n.weight + n.size, i] as const).sort((a, b) => b[0] - a[0]).slice(0, 28).map((x) => x[1]);
    const set = new Set<number>(byWeight);
    if (selected !== null) {
      set.add(selected);
      neighborsOf(model, selected).forEach((n) => set.add(n));
    }
    return Array.from(set);
  }, [model, selected]);

  const node = selected !== null ? model.nodes[selected] : null;
  const satellites = useMemo(() => (node ? (g.data?.works ?? []).filter((w) => w.artistId === node.id).map((w) => w.title) : []), [node, g.data]);
  const neighbors = useMemo(() => {
    if (selected === null) return [];
    return model.edges
      .filter((e) => e.a === selected || e.b === selected)
      .map((e) => {
        const other = e.a === selected ? e.b : e.a;
        const outgoing = e.a === selected;
        const rel = g.data?.relations.find((r) => (r.fromId === model.nodes[selected].id && r.toId === model.nodes[other].id) || (r.toId === model.nodes[selected].id && r.fromId === model.nodes[other].id));
        const label = e.implicit ? 'اثر مشترک' : rel ? relationLabel(rel.kind, rel.fromId === model.nodes[selected].id) : '';
        return { i: other, n: model.nodes[other], label, outgoing };
      });
  }, [selected, model, g.data]);

  const results = useMemo(() => (q.trim() ? model.nodes.map((n, i) => ({ n, i })).filter(({ n }) => matches(q, n.name)).slice(0, 8) : []), [q, model]);

  const playArtist = async (id: string) => {
    const rows = await artistRecordings(id);
    if (!playRows(rows)) router.push(`/artist/${id}`);
  };

  const empty = !g.loading && model.nodes.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#060608' }}>
      <GalaxyView ref={view} model={model} selected={selected} filter={filter} satellites={satellites} labelSet={labelSet} onSelect={select} active={focused} />

      {/* Top overlay */}
      <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
        <View style={[row, { justifyContent: 'space-between', paddingHorizontal: 18 }]} pointerEvents="box-none">
          <Animated.View entering={FadeIn.delay(400).duration(900)}>
            <Txt v="display" style={{ fontSize: 30, lineHeight: 44 }}>کهکشان</Txt>
            <Txt v="caption">{model.nodes.length ? `${toFa(model.nodes.length)} ستاره · ${toFa(model.edges.length)} پیوند` : 'نقشهٔ پیوند هنرمندان'}</Txt>
          </Animated.View>
          <View style={[row, { gap: 4 }]}>
            <IconBtn name="search" filled onPress={() => setSearching((v) => !v)} label="جست‌وجوی ستاره" />
            <IconBtn name="maximize" filled onPress={() => { select(null); view.current?.reset(); }} label="نمای کامل" />
          </View>
        </View>
        {searching ? (
          <Animated.View entering={FadeInDown.duration(300)} exiting={FadeOut} style={{ paddingHorizontal: 18, marginTop: 10 }}>
            <View style={styles.searchBox}>
              <View style={[row, { paddingHorizontal: 14, height: 46 }]}>
                <Feather name="search" size={16} color={C.faint} />
                <TextInput autoFocus value={q} onChangeText={setQ} placeholder={tr("نام هنرمند…")} placeholderTextColor={C.faint} style={styles.input} />
              </View>
              {results.map(({ n, i }) => (
                <Pressy key={n.id} onPress={() => { setSearching(false); setQ(''); select(i); }} style={[row, { paddingHorizontal: 14, paddingVertical: 8 }]} scaleTo={0.98}>
                  <View style={[styles.dot, { backgroundColor: n.color }]} />
                  <Txt v="small" color={C.text} style={{ marginRight: 10 }}>{n.name}</Txt>
                </Pressy>
              ))}
            </View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeIn.delay(700)} style={[row, { gap: 8, paddingHorizontal: 18, marginTop: 12 }]}>
            <Chip label="همه" active={filter === 0} onPress={() => setFilter(0)} />
            <Chip label="ایرانی" color={C.persian} active={filter === 1} onPress={() => setFilter(filter === 1 ? 0 : 1)} />
            <Chip label="کلاسیک" color={C.classical} active={filter === 2} onPress={() => setFilter(filter === 2 ? 0 : 2)} />
          </Animated.View>
        )}
      </View>

      {!node && !empty ? (
        <Animated.View entering={FadeIn.delay(1600).duration(900)} style={[styles.hint, { bottom: insets.bottom + 100 }]} pointerEvents="none">
          <Txt v="caption" center color={C.faint}>بکش تا بچرخد · دو انگشت برای نزدیک شدن · روی ستاره بزن</Txt>
        </Animated.View>
      ) : null}

      {empty ? (
        <Animated.View entering={FadeInUp.delay(800)} style={[styles.card, { bottom: insets.bottom + 100 }]}>
          <View style={styles.cardInner}>
            <Txt v="h2">کهکشانت هنوز خالی است</Txt>
            <Txt v="small" style={{ marginTop: 4 }}>هر هنرمندی که اضافه کنی، ستاره‌ای می‌شود و پیوندها صورت فلکی می‌سازند.</Txt>
            <View style={[row, { gap: 10, marginTop: 14 }]}>
              <Button label="افزودن هنرمند" icon="plus" onPress={() => router.push('/edit/artist')} />
              <Button label="ستاره‌های نمونه" kind="ghost" onPress={() => void seedStarter()} />
            </View>
          </View>
        </Animated.View>
      ) : null}

      {node ? (
        <Animated.View key={node.id} entering={FadeInDown.springify().damping(17)} exiting={FadeOutDown.duration(250)} style={[styles.card, { bottom: insets.bottom + 96 }]}>
          <View style={styles.cardInner}>
            <View style={[row]}>
              <Avatar uri={node.photo} name={node.name} size={58} ring={node.color} />
              <View style={{ flex: 1, marginRight: 14 }}>
                <Txt v="h2" numberOfLines={1}>{node.name}</Txt>
                <View style={[row, { gap: 8 }]}>
                  <Badge label={traditionLabel(node.tradition)} color={traditionColor(node.tradition)} />
                  <Txt v="caption">{yearsLabel(node.born, node.died)}</Txt>
                </View>
              </View>
              <IconBtn name="x" size={18} color={C.dim} onPress={() => select(null)} />
            </View>
            {neighbors.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 14, transform: [{ scaleX: -1 }] }} contentContainerStyle={{ gap: 8 }}>
                {neighbors.map((nb) => (
                  <View key={nb.n.id} style={{ transform: [{ scaleX: -1 }] }}>
                    <Pressy onPress={() => select(nb.i)} style={[row, styles.nb]} scaleTo={0.94}>
                      <View style={[styles.dot, { backgroundColor: nb.n.color }]} />
                      <Txt v="small" color={C.text} style={{ marginRight: 8 }}>{nb.n.name}</Txt>
                      {nb.label ? <Txt v="caption" style={{ marginRight: 6 }}>{nb.label}</Txt> : null}
                    </Pressy>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Txt v="caption" style={{ marginTop: 12 }}>هنوز پیوندی ثبت نشده. از صفحهٔ هنرمند، استاد، شاگرد یا همکارش را اضافه کن.</Txt>
            )}
            <View style={[row, { gap: 10, marginTop: 16 }]}>
              <Button label="صفحهٔ هنرمند" icon="user" onPress={() => router.push(`/artist/${node.id}`)} style={{ flex: 1 }} />
              <Button label="پخش" icon="play" kind="ghost" onPress={() => void playArtist(node.id)} />
            </View>
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  hint: { position: 'absolute', left: 30, right: 30 },
  card: { position: 'absolute', left: 14, right: 14 },
  cardInner: { borderRadius: 26, overflow: 'hidden', padding: 18, backgroundColor: 'rgba(18,16,14,0.94)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong },
  searchBox: { borderRadius: 18, overflow: 'hidden', backgroundColor: 'rgba(18,16,14,0.96)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong, paddingBottom: 6 },
  input: { flex: 1, color: C.text, fontFamily: F.regular, fontSize: 15.5, textAlign: 'right', marginRight: 10 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nb: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, paddingHorizontal: 12, height: 34 },
});
