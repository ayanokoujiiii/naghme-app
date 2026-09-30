import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C } from '../theme';

/** Bottom sheet used by transparent-modal routes. */
export function Sheet({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Animated.View entering={FadeIn.duration(250)} style={StyleSheet.absoluteFill}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)' }]} onPress={() => router.back()} />
      </Animated.View>
      <Animated.View entering={SlideInDown.springify().damping(19).stiffness(170)} style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.grip} />
        {/* v1.1: the content can shrink and scroll, so long menus are never cut off */}
        <View style={{ flexShrink: 1 }}>{children}</View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#17130F', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 10, borderWidth: 1, borderColor: 'rgba(210,161,95,0.3)', maxHeight: '90%', flexShrink: 1 },
  grip: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: 'rgba(210,161,95,0.6)', marginBottom: 12 },
});
