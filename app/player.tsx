import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, roleLabel } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, IconBtn, Pressy, row, tap } from '@/src/ui/kit';
import { Cover } from '@/src/ui/Media';
import { CarpetProgress } from '@/src/ui/CarpetProgress';
import { SanturScrubber } from '@/src/ui/SanturScrubber';
import { SoundDoily } from '@/src/motifs/SoundDoily';
import { CarpetBand } from '@/src/motifs/Ornament';
import { useDeepListening, useStretch } from '@/src/mood';
import { breathe } from '@/src/ui/breathe';
import { activeLine, parseLyrics } from '@/src/ui/lyrics';
import {
  usePlayer, currentItem, togglePlay, next, previous, seek, cycleRepeat, toggleShuffle, setSleep, jumpTo, removeFromQueue,
} from '@/src/audio/player';
import { fullCredits, getRecording, toggleFavorite, Credit, RecordingRow } from '@/src/db/repo';
import { qualityLabel } from '@/src/audio/formats';
import { fmtTime, toFa } from '@/src/utils';

type Pane = 'lyrics' | 'credits' | 'queue';

/** The cover floats gently; in deep listening the float stretches out (کشش زمان). */
function useFloat(stretch: number) {
  const t = useSharedValue(0);
  useEffect(() => {
    breathe(t, 9000 * stretch);
  }, [stretch]);
  return t;
}

function CreditTicker({ credits }: { credits: Credit[] }) {
  const [i, setI] = useState(0);
  const stretch = useStretch();
  useEffect(() => {
    if (credits.length < 2) return;
    const h = setInterval(() => setI((v) => (v + 1) % credits.length), 5200 * stretch);
    return () => clearInterval(h);
  }, [credits.length, stretch]);
  if (!credits.length) return null;
  const c = credits[i % credits.length];
  return (
    <Animated.View key={`${c.id}-${i}`} entering={FadeIn.duration(900 * stretch)} exiting={FadeOut.duration(600 * stretch)} style={{ height: 22, marginTop: 4 }}>
      <Txt v="caption" center color={C.dim}>{`${c.instrument || roleLabel(c.role)} · ${c.artistName}`}</Txt>
    </Animated.View>
  );
}

export default function Player() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const s = usePlayer();
  const item = currentItem(s);
  const [rec, setRec] = useState<RecordingRow | null>(null);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [pane, setPane] = useState<Pane>('lyrics');
  const [sleepOpen, setSleepOpen] = useState(false);
  const [fav, setFav] = useState(false);
  // «کشش زمان»: while this screen is open and the music plays, time stretches everywhere.
  useDeepListening(s.playing);
  const stretch = useStretch();
  const float = useFloat(stretch);
  const lyricScroll = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);

  useEffect(() => {
    if (!item) return;
    let alive = true;
    (async () => {
      const r = await getRecording(item.id);
      if (!alive || !r) return;
      setRec(r);
      setFav(!!r.favorite);
      setCredits(await fullCredits(r));
    })();
    return () => { alive = false; };
  }, [item?.id]);

  const lyrics = useMemo(() => parseLyrics(rec?.lyrics || rec?.workLyrics || item?.lyrics), [rec, item?.id]);
  const active = lyrics.synced ? activeLine(lyrics.lines, s.position) : -1;
  useEffect(() => {
    if (active >= 0 && lineY.current[active] !== undefined) lyricScroll.current?.scrollTo({ y: Math.max(0, lineY.current[active] - 80), animated: true });
  }, [active]);

  const size = Math.min(width - 96, height * 0.36);
  const coverStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${(float.value - 0.5) * 10}deg` },
      { rotateX: `${Math.sin(float.value * Math.PI) * 4}deg` },
      { scale: withSpring(s.playing ? 1 : 0.9, { damping: 16, stiffness: 120 }) },
    ],
  }), [s.playing]);

  if (!item) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Txt v="h3">چیزی در حال پخش نیست</Txt>
        <IconBtn name="chevron-down" onPress={() => router.back()} style={{ marginTop: 16 }} />
      </View>
    );
  }

  const sleepLabel = s.sleepAfterTrack ? 'پایان قطعه' : s.sleepEndsAt ? `${toFa(Math.max(1, Math.round((s.sleepEndsAt - Date.now()) / 60000)))} دقیقه` : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {item.cover ? <Image source={{ uri: item.cover }} style={StyleSheet.absoluteFill} blurRadius={60} contentFit="cover" transition={600} /> : null}
      <LinearGradient colors={['rgba(11,11,12,0.55)', 'rgba(11,11,12,0.88)', C.bg]} locations={[0, 0.5, 0.85]} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 6, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <View style={[row, { justifyContent: 'space-between', paddingHorizontal: 14 }]}>
          <IconBtn name="chevron-down" size={26} onPress={() => router.back()} label="بستن" />
          <View style={{ alignItems: 'center' }}>
            <Txt v="label" center color={C.zar}>شنیدن ژرف</Txt>
            {stretch > 1 ? <Animated.View entering={FadeIn.duration(1600)} exiting={FadeOut.duration(900)}><Txt v="caption" center color={C.faint}>زمان کش می‌آید</Txt></Animated.View> : null}
            {rec ? <Txt v="caption" center color={C.faint}>{qualityLabel(rec)}</Txt> : null}
          </View>
          <IconBtn name="more-horizontal" onPress={() => router.push(`/recording/${item.id}`)} label="بیشتر" />
        </View>

        <View style={{ alignItems: 'center', marginTop: 8, height: size * 1.45, justifyContent: 'center' }}>
          <View style={{ position: 'absolute' }}>
            <SoundDoily size={Math.min(width - 12, size * 1.55)} seed={item.id} />
          </View>
          <Animated.View style={[styles.coverShadow, coverStyle]}>
            <Cover uri={item.cover} size={size} radius={28} seed={item.id} />
          </Animated.View>
        </View>

        <CarpetBand width={width - 56} height={14} opacity={0.5} style={{ alignSelf: 'center', marginTop: 14 }} />
        <Animated.View key={item.id} entering={FadeInDown.duration(600)} style={{ paddingHorizontal: 28, marginTop: 14 }}>
          <View style={[row, { justifyContent: 'space-between' }]}>
            <View style={{ flex: 1 }}>
              <Pressy onPress={() => rec?.workId && router.push(`/work/${rec.workId}`)} haptic={false} scaleTo={0.99}>
                <Txt v="title" numberOfLines={2}>{item.title}</Txt>
              </Pressy>
              <Txt v="small" numberOfLines={1}>{item.artist || rec?.albumTitle || ' '}</Txt>
            </View>
            <IconBtn
              name="heart"
              color={fav ? C.accent : C.dim}
              onPress={async () => { tap('medium'); setFav(await toggleFavorite(item.id)); }}
              label="برگزیده"
            />
          </View>
          <CreditTicker credits={credits} />
        </Animated.View>

        <View style={{ paddingHorizontal: 28, marginTop: 14 }}>
          <SanturScrubber
            position={s.position}
            duration={s.duration}
            onSeek={(v) => void seek(v)}
            under={<CarpetProgress progress={s.duration > 0 ? s.position / s.duration : 0} />}
          />
        </View>

        <View style={styles.controls}>
          <IconBtn name="shuffle" size={18} color={s.shuffle ? C.accent : C.faint} onPress={toggleShuffle} label="تصادفی" />
          <IconBtn name="skip-back" size={26} onPress={() => void previous()} label="قبلی" />
          <Pressy onPress={() => { tap('medium'); void togglePlay(); }} scaleTo={0.9} style={styles.play}>
            <Feather name={s.playing ? 'pause' : 'play'} size={30} color="#141312" style={s.playing ? undefined : { marginLeft: 3 }} />
          </Pressy>
          <IconBtn name="skip-forward" size={26} onPress={() => void next()} label="بعدی" />
          <Pressy onPress={cycleRepeat} scaleTo={0.88} style={{ width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }}>
            <Feather name="repeat" size={18} color={s.repeat !== 'off' ? C.accent : C.faint} />
            {s.repeat === 'one' ? <Txt v="caption" color={C.accent} style={styles.one}>۱</Txt> : null}
          </Pressy>
        </View>

        <View style={[row, { justifyContent: 'center', gap: 10, marginTop: 6 }]}>
          <Chip label={sleepLabel ? `خواب · ${sleepLabel}` : 'زمان خواب'} icon="moon" active={!!sleepLabel} onPress={() => setSleepOpen((v) => !v)} />
          <Chip label="یادداشت" icon="feather" onPress={() => router.push({ pathname: '/journal', params: { recordingId: item.id, compose: '1' } })} />
        </View>
        {sleepOpen ? (
          <Animated.View entering={FadeInDown} style={[row, { justifyContent: 'center', flexWrap: 'wrap', gap: 8, marginTop: 10, paddingHorizontal: 20 }]}>
            {[15, 30, 45, 60].map((m) => (
              <Chip key={m} label={`${toFa(m)} دقیقه`} onPress={() => { setSleep(m); setSleepOpen(false); }} />
            ))}
            <Chip label="پایان قطعه" onPress={() => { setSleep('track'); setSleepOpen(false); }} />
            {sleepLabel ? <Chip label="انصراف" onPress={() => { setSleep(null); setSleepOpen(false); }} /> : null}
          </Animated.View>
        ) : null}

        <View style={[row, { justifyContent: 'center', gap: 8, marginTop: 28 }]}>
          <Chip label="متن" active={pane === 'lyrics'} onPress={() => setPane('lyrics')} />
          <Chip label="دست‌اندرکاران" active={pane === 'credits'} onPress={() => setPane('credits')} />
          <Chip label={`صف پخش · ${toFa(s.queue.length)}`} active={pane === 'queue'} onPress={() => setPane('queue')} />
        </View>

        <Animated.View key={pane} entering={FadeIn.duration(400)} style={styles.pane}>
          {pane === 'lyrics' ? (
            lyrics.lines.length ? (
              <ScrollView ref={lyricScroll} nestedScrollEnabled style={{ maxHeight: 340 }} contentContainerStyle={{ paddingVertical: 16 }}>
                {lyrics.lines.map((l, i) => (
                  <Pressy
                    key={i}
                    haptic={false}
                    scaleTo={0.99}
                    onPress={() => l.t !== null && void seek(l.t)}
                    onLayout={(e) => { lineY.current[i] = e.nativeEvent.layout.y; }}
                  >
                    <Txt
                      v={lyrics.synced ? 'h3' : 'body'}
                      center
                      color={!lyrics.synced ? C.text : i === active ? C.text : 'rgba(236,232,225,0.35)'}
                      style={{ paddingVertical: lyrics.synced ? 6 : 1, fontSize: lyrics.synced ? (i === active ? 18 : 15) : 15, lineHeight: 30 }}
                    >
                      {l.text || ' '}
                    </Txt>
                  </Pressy>
                ))}
              </ScrollView>
            ) : (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Txt v="small" center>متنی برای این قطعه ثبت نشده.</Txt>
                <Chip label="افزودن متن" icon="edit-2" onPress={() => router.push({ pathname: '/edit/recording', params: { id: item.id } })} />
              </View>
            )
          ) : pane === 'credits' ? (
            <View style={{ padding: 8 }}>
              {credits.length ? credits.map((c) => (
                <Pressy key={c.id} onPress={() => router.push(`/artist/${c.artistId}`)} style={[row, { paddingVertical: 10, paddingHorizontal: 12 }]} scaleTo={0.98}>
                  <Txt v="small" color={C.faint} style={{ width: 110 }}>{c.instrument || roleLabel(c.role)}</Txt>
                  <Txt v="h3" style={{ flex: 1 }}>{c.artistName}</Txt>
                  <Feather name="chevron-left" size={16} color={C.faint} />
                </Pressy>
              )) : (
                <Txt v="small" center style={{ padding: 20 }}>خواننده، نوازنده، آهنگساز و شاعر را از ویرایش قطعه اضافه کن.</Txt>
              )}
            </View>
          ) : (
            <View style={{ paddingVertical: 8 }}>
              {s.queue.map((q, i) => (
                <Pressy key={`${q.id}-${i}`} onPress={() => void jumpTo(i)} style={[row, { paddingVertical: 8, paddingHorizontal: 12 }]} scaleTo={0.98}>
                  <Cover uri={q.cover} size={40} radius={10} seed={q.id} />
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Txt v="small" color={i === s.index ? C.accent : C.text} numberOfLines={1}>{q.title}</Txt>
                    <Txt v="caption" numberOfLines={1}>{q.artist}</Txt>
                  </View>
                  <Txt v="caption" color={C.faint}>{fmtTime(q.duration)}</Txt>
                  {i !== s.index ? <IconBtn name="x" size={14} color={C.faint} onPress={() => removeFromQueue(i)} style={{ width: 32, height: 32 }} /> : <View style={{ width: 32 }} />}
                </Pressy>
              ))}
            </View>
          )}
        </Animated.View>
        {s.error ? <Txt v="small" center color={C.danger} style={{ marginTop: 12 }}>{s.error}</Txt> : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  coverShadow: { shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 30, shadowOffset: { width: 0, height: 18 }, elevation: 24, borderRadius: 28 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 26, marginTop: 8 },
  play: { width: 76, height: 76, borderRadius: 38, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' },
  one: { position: 'absolute', top: 4, right: 6, fontSize: 9 },
  pane: { marginHorizontal: 16, marginTop: 14, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.035)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line, minHeight: 120 },
});
