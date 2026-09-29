import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, Vazirmatn_300Light, Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold } from '@expo-google-fonts/vazirmatn';
import { Lalezar_400Regular } from '@expo-google-fonts/lalezar';
import { NotoNastaliqUrdu_400Regular } from '@expo-google-fonts/noto-nastaliq-urdu';
import { getDb } from '@/src/db';
import { getSetting, setSetting } from '@/src/db/repo';
import { seedStarter } from '@/src/db/seed';
import { restorePlayer } from '@/src/audio/player';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { overlayOptions, pageOptions, riseOptions, tabsOptions } from '@/src/ui/transitions';
import { UnravelHost } from '@/src/ui/Unravel';
import { startMoodClock } from '@/src/mood';
import { setLangNow, useLang } from '@/src/i18n';

// A JavaScript stack so every screen change can be choreographed (page turns, rising player).
const Stack = withLayoutContext(createStackNavigator().Navigator) as any;

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
void SystemUI.setBackgroundColorAsync(C.bg).catch(() => undefined);

export default function RootLayout() {
  const [fonts] = useFonts({ Vazirmatn_300Light, Vazirmatn_400Regular, Vazirmatn_500Medium, Vazirmatn_700Bold, Lalezar_400Regular, NotoNastaliqUrdu_400Regular });
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Changing the language rebuilds every screen so all text follows at once.
  const lang = useLang((s) => s.lang);

  useEffect(() => {
    (async () => {
      try {
        console.log('[Naghme] Starting initialization...');

        console.log('[Naghme] Opening database...');
        await getDb();
        console.log('[Naghme] Database opened successfully');

        const isSeeded = await getSetting('seeded');
        if (!isSeeded) {
          console.log('[Naghme] Seeding database with starter data...');
          await seedStarter();
          await setSetting('seeded', '1');
          console.log('[Naghme] Database seeded');
        }

        console.log('[Naghme] Restoring language preference...');
        const lang = await getSetting('lang');
        if (lang === 'en') setLangNow('en');
        console.log('[Naghme] Language set to:', lang || 'fa');

        console.log('[Naghme] Restoring player state...');
        await restorePlayer();
        console.log('[Naghme] Player restored');

        console.log('[Naghme] Starting mood clock...');
        startMoodClock();
        console.log('[Naghme] Mood clock started');

        console.log('[Naghme] Initialization complete');
        setReady(true);
      } catch (e: any) {
        console.error('[Naghme] Initialization error:', e);
        console.error('[Naghme] Stack trace:', e?.stack);
        const msg = e?.message ?? 'باز کردن آرشیو ممکن نشد.';
        console.error('[Naghme] Setting error:', msg);
        setError(msg);
      }
    })();
  }, []);

  useEffect(() => {
    if ((fonts && ready) || error) void SplashScreen.hideAsync().catch(() => undefined);
  }, [fonts, ready, error]);

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Txt v="h2" center>آرشیو باز نشد</Txt>
        <Txt v="small" center style={{ marginTop: 8 }}>{error}</Txt>
      </View>
    );
  }
  if (!fonts || !ready) return <View style={{ flex: 1, backgroundColor: C.bg }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: C.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack key={lang} screenOptions={pageOptions}>
          <Stack.Screen name="(tabs)" options={tabsOptions} />
          <Stack.Screen name="player" options={riseOptions} />
          <Stack.Screen name="add" options={overlayOptions} />
          <Stack.Screen name="recording/[id]" options={overlayOptions} />
          <Stack.Screen name="viewer" options={overlayOptions} />
        </Stack>
        <UnravelHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
