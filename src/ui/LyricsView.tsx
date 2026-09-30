import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F } from '../theme';
import { Txt } from './Txt';
import { Chip, IconBtn, Pressy, row, tap } from './kit';
import { Termeh } from '../motifs/Termeh';
import { activeLine, parseLyrics } from './lyrics';
import { seek, togglePlay, usePlayer } from '../audio/player';
import { setRecordingLyrics } from '../db/repo';
import { fmtTime, toFa } from '../utils';

/** [mm:ss.xx] */
function stamp(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `[${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}]`;
}

/**
 * «متن»، تمام‌صفحه (v1.1)
 * - The whole text always scrolls freely (no nested scroll views any more).
 * - Synced (LRC) lyrics light up line by line and follow the music, like Spotify;
 *   tap a line to jump there.
 * - Plain lyrics can be synced by hand: press «این خط» each time a line starts.
 * - An .lrc file can be imported.
 */
export function LyricsView({ recordingId, source, title, onClose }: { recordingId: string; source: string | null; title: string; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const position = usePlayer((s) => s.position);
  const playing = usePlayer((s) => s.playing);
  const [text, setText] = useState(source ?? '');
  const lyrics = useMemo(() => parseLyrics(text), [text]);
  const active = lyrics.synced ? activeLine(lyrics.lines, position) : -1;
  const scroll = useRef<ScrollView>(null);
  const lineY = useRef<number[]>([]);
  const userScrolling = useRef(0);

  // hand-sync mode
  const [syncing, setSyncing] = useState(false);
  const [stamps, setStamps] = useState<number[]>([]);
  const plainLines = useMemo(() => lyrics.lines.map((l) => l.text), [lyrics]);

  useEffect(() => {
    if (active < 0 || syncing) return;
    if (Date.now() - userScrolling.current < 2500) return; // don't fight the finger
    const y = lineY.current[active];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - height * 0.32), animated: true });
  }, [active, syncing]);

  useEffect(() => {
    if (!syncing) return;
    const y = lineY.current[stamps.length];
    if (y !== undefined) scroll.current?.scrollTo({ y: Math.max(0, y - height * 0.32), animated: true });
  }, [stamps.length, syncing]);

  const save = async (lrc: string) => {
    await setRecordingLyrics(recordingId, lrc);
    setText(lrc);
  };

  const importLrc = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: false });
      if (res.canceled || !res.assets?.[0]) return;
      const body = await new File(res.assets[0].uri).text();
      if (!/\[\d{1,2}:\d{1,2}/.test(body)) {
        Alert.alert('این فایل زمان‌بندی ندارد', 'فایل LRC باید برای هر خط زمانی مثل [01:23.45] داشته باشد.');
        return;
      }
      await save(body);
      tap('medium');
    } catch (e: any) {
      Alert.alert('فایل خوانده نشد', e?.message ?? '');
    }
  };

  const startSync = () => {
    const lines = plainLines.filter((l) => l.trim());
    if (!lines.length) return;
    setStamps([]);
    setSyncing(true);
    void seek(0);
    if (!playing) void togglePlay();
  };
  const mark = () => {
    tap('select');
    const next = [...stamps, position];
    setStamps(next);
    const lines = plainLines.filter((l) => l.trim());
    if (next.length >= lines.length) {
      const lrc = lines.map((l, i) => `${stamp(next[i])}${l}`).join('\n');
      setSyncing(false);
      void save(lrc);
      Alert.alert('همگام شد', 'از این به بعد متن همراه آهنگ جلو می‌رود.');
    }
  };

  const shownLines = syncing ? plainLines.filter((l) => l.trim()) : lyrics.lines.map((l) => l.text);

  return (
    <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(200)} style={[StyleSheet.absoluteFill, styles.wrap]}>
      <Termeh pattern="gol" opacity={0.08} />
      <View style={[row, { paddingTop: insets.top + 6, paddingHorizontal: 14, justifyContent: 'space-between' }]}>
        <IconBtn name="chevron-down" size={26} color={C.zarBright} onPress={onClose} label="بستن" />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Txt v="label" color={C.zarBright}>متن</Txt>
          <Txt v="caption" numberOfLines={1}>{title}</Txt>
        </View>
        <IconBtn name={playing ? 'pause' : 'play'} filled onPress={() => void togglePlay()} label="پخش" />
      </View>

      <ScrollView
        ref={scroll}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 26, paddingTop: height * 0.12, paddingBottom: height * 0.45 }}
        onScrollBeginDrag={() => { userScrolling.current = Date.now(); }}
        showsVerticalScrollIndicator={false}
      >
        {shownLines.length ? shownLines.map((l, i) => {
          const isNow = syncing ? i === stamps.length : i === active;
          const past = syncing ? i < stamps.length : lyrics.synced && i < active;
          const color = !lyrics.synced && !syncing ? C.text : isNow ? C.zarBright : past ? 'rgba(245,240,232,0.55)' : 'rgba(245,240,232,0.38)';
          return (
            <Pressy
              key={i}
              haptic={false}
              scaleTo={0.99}
              onPress={() => { const t = lyrics.lines[i]?.t; if (!syncing && t !== null && t !== undefined) void seek(t); }}
              onLayout={(e) => { lineY.current[i] = e.nativeEvent.layout.y; }}
            >
              <Txt
                center
                color={color}
                style={{ fontFamily: isNow ? F.bold : F.medium, fontSize: isNow ? 24 : 20, lineHeight: 40, paddingVertical: 6 }}
              >
                {l || ' '}
              </Txt>
            </Pressy>
          );
        }) : (
          <Txt v="body" center>متنی ثبت نشده.</Txt>
        )}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: insets.bottom + 14 }]}>
        {syncing ? (
          <>
            <Txt v="small" center color={C.dim}>{`هر بار که خطِ طلایی شروع شد، «این خط» را بزن · ${toFa(stamps.length)} از ${toFa(shownLines.length)} · ${fmtTime(position)}`}</Txt>
            <View style={[row, { gap: 10, marginTop: 12, justifyContent: 'center' }]}>
              <Pressy onPress={mark} style={styles.markBtn} scaleTo={0.94}>
                <Feather name="check" size={22} color="#1A1410" />
                <Txt v="h3" color="#1A1410" style={{ marginRight: 8 }}>این خط</Txt>
              </Pressy>
              <IconBtn name="rotate-ccw" filled onPress={() => setStamps((s) => s.slice(0, -1))} label="برگرداندن" />
              <IconBtn name="x" filled onPress={() => setSyncing(false)} label="انصراف" />
            </View>
          </>
        ) : (
          <View style={[row, { gap: 8, justifyContent: 'center', flexWrap: 'wrap' }]}>
            {!lyrics.synced && shownLines.length ? <Chip icon="clock" label="همگام‌سازی با ضربه" onPress={startSync} /> : null}
            {lyrics.synced ? <Chip icon="refresh-cw" label="همگام‌سازی دوباره" onPress={() => { setText(plainLines.join('\n')); setTimeout(startSync, 50); }} /> : null}
            <Chip icon="file-text" label="وارد کردن فایل LRC" onPress={importLrc} />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: 'rgba(10,9,8,0.985)', zIndex: 50 },
  bar: { paddingHorizontal: 18, paddingTop: 14, borderTopWidth: 1, borderColor: C.line, backgroundColor: 'rgba(18,15,12,0.98)' },
  markBtn: { flexDirection: 'row-reverse', alignItems: 'center', height: 54, paddingHorizontal: 28, borderRadius: 27, backgroundColor: C.zarBright },
});
