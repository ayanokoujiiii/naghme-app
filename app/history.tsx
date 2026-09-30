import React, { useMemo } from 'react';
import { TermehProvider } from '@/src/motifs/Termeh';
import { Alert, SectionList, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, Empty, Header, Loading, Pressy, row } from '@/src/ui/kit';
import { Ambient } from '@/src/ui/Ambient';
import { Cover } from '@/src/ui/Media';
import { unfold } from '@/src/ui/motion';
import { useData } from '@/src/hooks/useData';
import { clearHistory, historyTotals, listHistory, removeHistory } from '@/src/db/extra';
import { recArtistLine, recCover } from '@/src/db/repo';
import { playRows } from '@/src/audio/queue';
import { jalaliLabel, jalaliMonth } from '@/src/calendar';
import { fmtMinutes, toFa } from '@/src/utils';
import { Rosette } from '@/src/motifs/Ornament';
import { unravel } from '@/src/ui/Unravel';

/** Listening history, grouped by Persian month, with the time you really listened. */
export default function HistoryScreen() {
  const h = useData(() => listHistory(400), []);
  const totals = useData(() => historyTotals(), []);

  const sections = useMemo(() => {
    const map = new Map<string, typeof h.data>();
    for (const r of h.data ?? []) {
      const k = jalaliMonth(r.playedAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return [...map.entries()].map(([title, data]) => ({ title, data: data ?? [] }));
  }, [h.data]);

  return (
    <TermehProvider pattern="ab">
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Ambient intensity={0.6} />
      <Header
        title="تاریخچهٔ شنیدن"
        subtitle={totals.data?.plays ? `${toFa(totals.data.plays)} بار شنیدن · ${fmtMinutes(totals.data.seconds)}` : undefined}
        right={h.data?.length ? (
          <Chip label="پاک کردن" icon="trash-2" onPress={() => Alert.alert('پاک کردن تاریخچه', 'همهٔ سابقهٔ شنیدن پاک شود؟ قطعه‌ها و آرشیو دست نمی‌خورند.', [
            { text: 'انصراف', style: 'cancel' },
            { text: 'پاک شود', style: 'destructive', onPress: () => unravel(() => void clearHistory()) },
          ])} />
        ) : null}
      />
      {h.loading ? <Loading /> : !h.data?.length ? (
        <Empty icon="clock" title="هنوز چیزی نشنیده‌ای" hint="هر بار که قطعه‌ای را گوش بدهی، این‌جا با تاریخ خورشیدی ثبت می‌شود." />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) => r.historyId}
          contentContainerStyle={{ paddingBottom: 120 }}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <View style={[row, { paddingHorizontal: 22, marginTop: 24, marginBottom: 8, gap: 8 }]}>
              <Rosette size={16} />
              <Txt v="label" color={C.zar}>{section.title}</Txt>
            </View>
          )}
          renderItem={({ item, index }) => (
            <Animated.View entering={unfold(Math.min(index, 10) * 40, 520)}>
              <Pressy
                onPress={() => playRows([item])}
                onLongPress={() => Alert.alert('حذف از تاریخچه', item.title, [{ text: 'انصراف' }, { text: 'حذف', style: 'destructive', onPress: () => unravel(() => void removeHistory(item.historyId)) }])}
                scaleTo={0.98}
                style={[row, { paddingHorizontal: 18, paddingVertical: 8 }]}
              >
                <Cover uri={recCover(item)} size={46} radius={23} seed={item.id} />
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Txt v="h3" numberOfLines={1}>{item.title}</Txt>
                  <Txt v="caption" numberOfLines={1}>{[recArtistLine(item), jalaliLabel(new Date(item.playedAt))].filter(Boolean).join(' · ')}</Txt>
                </View>
                <View style={{ alignItems: 'flex-start' }}>
                  <Txt v="caption" color={C.faint}>{item.listened > 30 ? fmtMinutes(item.listened) : 'گذرا'}</Txt>
                  {item.completion ? (
                    <View style={{ width: 40, height: 2, backgroundColor: C.line, marginTop: 4 }}>
                      <View style={{ width: `${Math.min(100, item.completion)}%`, height: 2, backgroundColor: C.zar }} />
                    </View>
                  ) : null}
                </View>
              </Pressy>
            </Animated.View>
          )}
        />
      )}
    </View>
    </TermehProvider>
  );
}
