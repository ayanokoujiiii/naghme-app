import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C, traditionColor } from '../theme';
import { fmtTime, toFa, yearsLabel } from '../utils';
import { RecordingRow as Rec, recArtistLine, recCover, ArtistListItem, WorkListItem } from '../db/repo';
import { usePlayer, currentItem } from '../audio/player';
import { isHiRes } from '../audio/formats';
import { Txt } from './Txt';
import { Pressy, row, Badge } from './kit';
import { Avatar, Cover } from './Media';

export function RecordingItem({ r, onPlay, index = 0, showCover = true, number }: { r: Rec; onPlay?: () => void; index?: number; showCover?: boolean; number?: number }) {
  const isCurrent = usePlayer((s) => currentItem(s)?.id === r.id);
  const playing = usePlayer((s) => s.playing && currentItem(s)?.id === r.id);
  const missing = !r.audioUri;
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 35).duration(420)}>
      <Pressy onPress={missing ? () => router.push(`/recording/${r.id}`) : onPlay} onLongPress={() => router.push(`/recording/${r.id}`)} scaleTo={0.98} style={[row, styles.recRow]}>
        {number !== undefined ? (
          <View style={{ width: 26, alignItems: 'center' }}>
            {isCurrent ? <Feather name={playing ? 'volume-2' : 'pause'} size={14} color={C.accent} /> : <Txt v="small" color={C.faint}>{toFa(number)}</Txt>}
          </View>
        ) : null}
        {showCover ? (
          <View>
            <Cover uri={recCover(r)} size={50} radius={12} seed={r.id} />
            {isCurrent && number === undefined ? (
              <View style={styles.nowDot}><Feather name={playing ? 'volume-2' : 'pause'} size={11} color="#141312" /></View>
            ) : null}
          </View>
        ) : null}
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Txt v="h3" numberOfLines={1} color={isCurrent ? C.accent : missing ? C.dim : C.text}>{r.title}</Txt>
          <View style={[row, { gap: 6 }]}>
            <Txt v="small" numberOfLines={1} style={{ flexShrink: 1 }}>{recArtistLine(r) || r.albumTitle || 'بی‌نام'}</Txt>
            {isHiRes(r) ? <Badge label={r.format === 'dsf' || r.format === 'dff' ? 'DSD' : 'باکیفیت'} /> : null}
            {missing ? <Badge label="بدون فایل" color={C.faint} /> : null}
          </View>
        </View>
        <Txt v="caption" color={C.faint} style={{ marginLeft: 6 }}>{r.duration ? fmtTime(r.duration) : ''}</Txt>
        <Pressy onPress={() => router.push(`/recording/${r.id}`)} scaleTo={0.85} style={{ padding: 8 }}>
          <Feather name="more-vertical" size={16} color={C.faint} />
        </Pressy>
      </Pressy>
    </Animated.View>
  );
}

export function ArtistTile({ a, index = 0, width }: { a: ArtistListItem | any; index?: number; width: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(450)} style={{ width }}>
      <Pressy onPress={() => router.push(`/artist/${a.id}`)} scaleTo={0.97}>
        <Cover uri={a.photo} size={width} radius={22} seed={a.id} icon="user" tint={traditionColor(a.tradition)} />
        <View style={[styles.tradDot, { backgroundColor: traditionColor(a.tradition) }]} />
        <Txt v="h3" numberOfLines={1} style={{ marginTop: 10 }}>{a.name}</Txt>
        <Txt v="caption" numberOfLines={1}>{yearsLabel(a.born, a.died) || a.instruments || ' '}</Txt>
      </Pressy>
    </Animated.View>
  );
}

export function ArtistChip({ a, sub, onPress }: { a: { id: string; name: string; photo?: string | null; tradition?: string }; sub?: string; onPress?: () => void }) {
  return (
    <Pressy onPress={onPress ?? (() => router.push(`/artist/${a.id}`))} style={[row, styles.artistChip]} scaleTo={0.95}>
      <Avatar uri={a.photo} name={a.name} size={34} />
      <View style={{ marginRight: 10, marginLeft: 6 }}>
        <Txt v="small" color={C.text} numberOfLines={1}>{a.name}</Txt>
        {sub ? <Txt v="caption" numberOfLines={1}>{sub}</Txt> : null}
      </View>
    </Pressy>
  );
}

export function workMeta(w: Partial<WorkListItem>): string {
  const parts = [w.form, w.dastgah && `دستگاه ${w.dastgah}`, w.avaz && `آواز ${w.avaz}`, w.catalog, w.year && toFa(w.year)].filter(Boolean);
  return parts.join(' · ');
}

export function WorkItem({ w, index = 0 }: { w: WorkListItem; index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 35).duration(420)}>
      <Pressy onPress={() => router.push(`/work/${w.id}`)} scaleTo={0.98} style={[row, styles.recRow]}>
        <Cover uri={w.poster} size={50} radius={12} seed={w.id} icon="feather" tint={traditionColor(w.tradition)} />
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Txt v="h3" numberOfLines={1}>{w.title}</Txt>
          <Txt v="small" numberOfLines={1}>{[w.composers, workMeta(w)].filter(Boolean).join('  ·  ') || 'اثر'}</Txt>
        </View>
        {w.recCount ? <Txt v="caption" color={C.faint}>{toFa(w.recCount)} اجرا</Txt> : null}
      </Pressy>
    </Animated.View>
  );
}

export function AlbumTile({ al, width, index = 0 }: { al: { id: string; title: string; cover: string | null; year?: string | null; artists?: string | null }; width: number; index?: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 10) * 40).duration(450)} style={{ width }}>
      <Pressy onPress={() => router.push(`/album/${al.id}`)} scaleTo={0.97}>
        <Cover uri={al.cover} size={width} radius={18} seed={al.id} icon="disc" />
        <Txt v="h3" numberOfLines={1} style={{ marginTop: 10 }}>{al.title}</Txt>
        <Txt v="caption" numberOfLines={1}>{[al.artists, al.year && toFa(al.year)].filter(Boolean).join(' · ') || ' '}</Txt>
      </Pressy>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  recRow: { paddingHorizontal: 18, paddingVertical: 9 },
  nowDot: { position: 'absolute', bottom: -3, left: -3, width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' },
  tradDot: { position: 'absolute', top: 12, right: 12, width: 7, height: 7, borderRadius: 4, opacity: 0.9 },
  artistChip: { backgroundColor: C.surface, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 5, borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
});
