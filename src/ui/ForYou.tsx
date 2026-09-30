import React from 'react';
import { FlatList, View, useWindowDimensions } from 'react-native';
import Animated from 'react-native-reanimated';
import { C } from '../theme';
import { useData } from '../hooks/useData';
import { suggestions } from '../db/extra';
import { recArtistLine, recCover } from '../db/repo';
import { playRows } from '../audio/queue';
import { Txt } from './Txt';
import { Pressy, Section } from './kit';
import { Cover } from './Media';
import { unfold } from './motion';

/** «برای این لحظه»: suggestions from your own archive, with the reason spelled out. */
export function ForYou() {
  const { width } = useWindowDimensions();
  const s = useData(() => suggestions(10), []);
  const list = s.data ?? [];
  if (!list.length) return null;
  const tile = Math.min(170, (width - 60) / 2.1);
  const rows = list.map((x) => x.rec);
  return (
    <Section title="برای این لحظه">
      <FlatList
        horizontal
        inverted
        data={list}
        keyExtractor={(x) => x.rec.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, gap: 14 }}
        renderItem={({ item, index }) => (
          <Animated.View entering={unfold(index * 70)} style={{ width: tile }}>
            <Pressy bloom onPress={() => playRows(rows, item.rec.id)} scaleTo={0.96}>
              <Cover uri={recCover(item.rec)} size={tile} radius={tile / 2} seed={item.rec.id} />
              <View style={{ position: 'absolute', top: 8, right: 8, left: 8, alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: 'rgba(14,12,10,0.72)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, borderWidth: 0.5, borderColor: `${C.zar}66` }}>
                  <Txt v="caption" color={C.zar} numberOfLines={1}>{item.reason}</Txt>
                </View>
              </View>
              <Txt v="h3" numberOfLines={1} center style={{ marginTop: 8, fontSize: 15 }}>{item.rec.title}</Txt>
              <Txt v="caption" numberOfLines={1} center>{recArtistLine(item.rec)}</Txt>
            </Pressy>
          </Animated.View>
        )}
      />
    </Section>
  );
}
