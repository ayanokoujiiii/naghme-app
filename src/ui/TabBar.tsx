import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { C } from '../theme';
import { Txt } from './Txt';
import { Pressy, tap } from './kit';
import { MiniPlayer } from './MiniPlayer';
import { Doily } from '../motifs/Ornament';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = { index: 'headphones', archive: 'layers', galaxy: 'aperture' };
const LABELS: Record<string, string> = { index: 'بشنو', archive: 'آرشیو', galaxy: 'کهکشان' };
export const TAB_HEIGHT = 64;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const barW = Math.min(width - 48, 340);
  const n = state.routes.length;
  const slot = (barW - 12) / n;
  // RTL: first tab sits on the right
  const ind = useAnimatedStyle(() => ({
    transform: [{ translateX: withSpring(-(state.index * slot), { damping: 18, stiffness: 180 }) }],
  }), [state.index, slot]);
  // the little doily rolls along the bar like a coin when you change tabs
  const rot = useSharedValue(0);
  React.useEffect(() => {
    rot.value = withSpring(state.index * 150, { damping: 16, stiffness: 120 });
  }, [state.index]);
  const roll = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));
  const bottom = Math.max(insets.bottom, 12) + 6;
  const onGalaxy = state.routes[state.index]?.name === 'galaxy';
  return (
    <>
      {!onGalaxy ? <MiniPlayer bottom={bottom + TAB_HEIGHT + 10} /> : null}
      <View style={[styles.wrap, { bottom }]} pointerEvents="box-none">
        <BlurView intensity={40} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.bar, { width: barW }]}>
          <Animated.View style={[styles.indicator, { width: slot, right: 6 }, ind]}>
            <Animated.View style={[{ position: 'absolute', alignSelf: 'center', top: -4 }, roll]}>
              <Doily size={58} seed="tab" opacity={0.55} fill={0.12} />
            </Animated.View>
          </Animated.View>
          {state.routes.map((route, i) => {
            const focused = state.index === i;
            return (
              <Pressy
                key={route.key}
                haptic={false}
                scaleTo={0.9}
                style={[styles.item, { width: slot }]}
                onPress={() => {
                  tap('select');
                  const e = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                  if (!focused && !e.defaultPrevented) navigation.navigate(route.name as never);
                }}
              >
                <Feather name={ICONS[route.name] ?? 'circle'} size={19} color={focused ? C.zar : C.faint} />
                <Txt v="caption" center color={focused ? C.text : C.faint} style={{ marginTop: 2 }}>{LABELS[route.name] ?? route.name}</Txt>
              </Pressy>
            );
          })}
        </BlurView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  bar: {
    height: TAB_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 6,
    backgroundColor: 'rgba(20,19,18,0.7)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.lineStrong,
  },
  indicator: { position: 'absolute', top: 7, bottom: 7, borderRadius: 26, backgroundColor: 'rgba(210,161,95,0.08)', overflow: 'hidden', alignItems: 'center' },
  item: { alignItems: 'center', justifyContent: 'center', height: TAB_HEIGHT },
});
