import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/src/ui/TabBar';
import { C } from '@/src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: C.bg }, animation: 'fade', transitionSpec: { animation: 'timing', config: { duration: 170 } }, lazy: true } as any}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="archive" />
      <Tabs.Screen name="galaxy" />
      <Tabs.Screen name="chat" />
    </Tabs>
  );
}
