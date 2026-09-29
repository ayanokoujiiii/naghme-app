import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { C, F } from '../theme';
import { toFa } from '../utils';
import { Txt } from './Txt';

/**
 * «ویترین موزه»: each item of the archive stands in a glass case of a museum
 * hall. A warm spotlight falls from above, a glare slides across the glass now
 * and then, and a small plinth carries the object's catalogue number.
 * The item is rendered once and stays fully interactive.
 */
export function VitrineCard({ children, width, index = 0 }: { children: React.ReactNode; width: number; index?: number }) {
  const glare = useSharedValue(0);
  useEffect(() => {
    glare.value = withDelay(
      900 + (index % 6) * 420,
      withRepeat(withSequence(withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.quad) }), withDelay(6500, withTiming(0, { duration: 0 }))), -1, false),
    );
  }, []);
  const g = useAnimatedStyle(() => ({
    opacity: glare.value > 0 && glare.value < 1 ? 1 : 0,
    transform: [{ translateX: -width * 0.6 + glare.value * width * 1.8 }, { rotate: '18deg' }],
  }));

  return (
    <View style={{ width }}>
      <View style={styles.case}>
        {/* spotlight from the ceiling */}
        <LinearGradient
          colors={['rgba(243,217,168,0.28)', 'rgba(243,217,168,0.06)', 'rgba(243,217,168,0)']}
          locations={[0, 0.35, 0.8]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={{ padding: 8 }}>{children}</View>
        {/* the glass */}
        <View style={styles.glass} pointerEvents="none" />
        <Animated.View style={[styles.glare, { height: width * 2.2 }, g]} pointerEvents="none">
          <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ flex: 1 }} />
        </Animated.View>
      </View>
      {/* plinth and museum label */}
      <View style={styles.plinth}>
        <View style={styles.goldLine} />
        <Txt v="caption" center color={C.zar} style={{ fontFamily: F.medium, fontSize: 9.5, letterSpacing: 1 }}>{`شیء ${toFa(String(index + 1).padStart(4, '0'))}`}</Txt>
      </View>
      <View style={styles.shadow} />
    </View>
  );
}

const styles = StyleSheet.create({
  case: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  glass: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.025)',
  },
  glare: { position: 'absolute', top: '-60%', left: 0, width: 46 },
  plinth: {
    height: 24,
    backgroundColor: '#15130F',
    borderBottomLeftRadius: 6,
    borderBottomRightRadius: 6,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(210,161,95,0.35)',
  },
  goldLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: C.zar, opacity: 0.6 },
  shadow: { height: 8, marginHorizontal: 10, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, backgroundColor: 'rgba(0,0,0,0.35)' },
});
