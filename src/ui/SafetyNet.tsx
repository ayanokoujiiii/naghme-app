import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { create } from 'zustand';
import { C, F } from '../theme';
import { Txt } from './Txt';
import { Button, IconBtn, row } from './kit';

/**
 * v1.1 safety net.
 * Without it, any unexpected JavaScript error in a release build closes the app
 * with «نغمه keeps stopping» and leaves no trace. Now:
 *  - errors while drawing a screen are caught by <ErrorBoundary> and shown as a
 *    readable page with a way back home;
 *  - errors anywhere else (timers, promises, callbacks) are caught by a global
 *    handler and shown as a small card at the bottom; the app keeps running.
 * The message and the first lines of the stack are on screen, so a single
 * screenshot is enough to find the bug.
 */
interface NetState { error: { message: string; stack: string } | null }
const useNet = create<NetState>(() => ({ error: null }));

function describe(e: any) {
  return {
    message: String(e?.message ?? e ?? 'خطای ناشناخته').slice(0, 400),
    stack: String(e?.stack ?? '').split('\n').slice(0, 6).join('\n').slice(0, 900),
  };
}

let installed = false;
export function installGlobalErrorHandler() {
  if (installed) return;
  installed = true;
  const EU: any = (globalThis as any).ErrorUtils;
  if (!EU?.setGlobalHandler) return;
  EU.setGlobalHandler((e: any) => {
    // Never re-throw: re-throwing a fatal error is what kills the app.
    try { console.error('[Naghme]', e); } catch { /* ignore */ }
    useNet.setState({ error: describe(e) });
  });
  // Unhandled promise rejections (Hermes has a built-in tracker)
  try {
    (globalThis as any).HermesInternal?.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (_id: number, e: any) => useNet.setState({ error: describe(e) }),
      onHandled: () => undefined,
    });
  } catch {
    /* not available: rejections are simply ignored, as before */
  }
}

export function ErrorToast() {
  const err = useNet((s) => s.error);
  if (!err) return null;
  return (
    <Animated.View entering={FadeInDown.duration(250)} exiting={FadeOutDown.duration(200)} style={styles.toast}>
      <View style={[row, { justifyContent: 'space-between' }]}>
        <Txt v="label" color={C.danger}>یک خطا پیش آمد، ولی نغمه باز ماند</Txt>
        <IconBtn name="x" size={18} onPress={() => useNet.setState({ error: null })} style={{ width: 34, height: 34 }} />
      </View>
      <Txt v="small" color={C.text} selectable>{err.message}</Txt>
      {err.stack ? <Txt v="caption" left color={C.faint} selectable style={{ fontFamily: F.regular, marginTop: 4 }}>{err.stack}</Txt> : null}
      <Txt v="caption" color={C.dim} style={{ marginTop: 6 }}>اگر تکرار شد، از همین کارت عکس بگیر و بفرست.</Txt>
    </Animated.View>
  );
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: any }> {
  state = { error: null as any };
  static getDerivedStateFromError(error: any) {
    return { error };
  }
  componentDidCatch(error: any) {
    try { console.error('[Naghme] render error', error); } catch { /* ignore */ }
  }
  reset = () => this.setState({ error: null });
  render() {
    if (!this.state.error) return this.props.children;
    const d = describe(this.state.error);
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: 70, paddingHorizontal: 24 }}>
        <Txt v="title" color={C.zarBright}>این صفحه باز نشد</Txt>
        <Txt v="body" style={{ marginTop: 8 }}>نغمه بسته نشد و آرشیوت سالم است. از اینجا عکس بگیر و بفرست تا درستش کنیم.</Txt>
        <ScrollView style={{ marginTop: 18, maxHeight: 280 }} contentContainerStyle={styles.box}>
          <Txt v="small" color={C.danger} selectable>{d.message}</Txt>
          {d.stack ? <Txt v="caption" left color={C.faint} selectable style={{ marginTop: 6 }}>{d.stack}</Txt> : null}
        </ScrollView>
        <View style={[row, { gap: 10, marginTop: 22 }]}>
          <Button label="بازگشت" icon="chevron-right" onPress={() => { try { if (router.canGoBack()) router.back(); else router.replace('/'); } catch { /* ignore */ } this.reset(); }} style={{ flex: 1 }} />
          <Button label="دوباره" kind="ghost" onPress={this.reset} />
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', left: 12, right: 12, bottom: 110, padding: 14, borderRadius: 18,
    backgroundColor: 'rgba(28,18,16,0.98)', borderWidth: 1, borderColor: 'rgba(238,143,128,0.5)', zIndex: 999,
  },
  box: { padding: 14, borderRadius: 14, backgroundColor: 'rgba(255,240,220,0.06)', borderWidth: 1, borderColor: C.line },
});
