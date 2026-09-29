import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { C } from '@/src/theme';
import { Empty } from '@/src/ui/kit';

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, justifyContent: 'center' }}>
      <Empty icon="compass" title="این‌جا چیزی نیست" hint="شاید این مورد حذف شده باشد." action="بازگشت به خانه" onAction={() => router.replace('/')} />
    </View>
  );
}
