import React from 'react';
import { ActivityIndicator, Pressable, PressableProps, StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, R } from '../theme';
import { Txt } from './Txt';
import { Boteh, Rosette } from '../motifs/Ornament';
import { Termeh, TermehPattern } from '../motifs/Termeh';
import { unfold } from './motion';

export const row = { flexDirection: 'row-reverse' as const, alignItems: 'center' as const };

export function tap(kind: 'light' | 'medium' | 'select' = 'light') {
  if (kind === 'select') void Haptics.selectionAsync().catch(() => undefined);
  else void Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

interface PressyProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  haptic?: boolean;
  children?: React.ReactNode;
}

/**
 * Pressable with a soft spring-scale response. With `bloom`, a small gold
 * Persepolis rosette opens and fades at the exact point of the touch.
 */
export function Pressy({ style, scaleTo = 0.96, haptic = true, bloom = false, onPress, children, ...rest }: PressyProps & { bloom?: boolean }) {
  const s = useSharedValue(1);
  const b = useSharedValue(0);
  const [at, setAt] = React.useState<{ x: number; y: number; k: number } | null>(null);
  const a = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  const bs = useAnimatedStyle(() => ({
    opacity: (1 - b.value) * 0.9,
    transform: [{ scale: 0.25 + b.value * 1.6 }, { rotate: `${b.value * 90}deg` }],
  }));
  return (
    <Pressable
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, { damping: 18, stiffness: 320 });
        if (bloom) {
          setAt({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY, k: Date.now() });
          b.value = 0;
          b.value = withTiming(1, { duration: 650 });
        }
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, { damping: 14, stiffness: 220 });
        rest.onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) tap('light');
        onPress?.(e);
      }}
    >
      <Animated.View style={[a, style]}>
        {children}
        {bloom && at ? (
          <Animated.View key={at.k} pointerEvents="none" style={[{ position: 'absolute', left: at.x - 36, top: at.y - 36 }, bs]}>
            <Rosette size={72} color={C.zar} />
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

/** A card of termeh cloth: every card carries a faint woven بته‌جقه texture. Pass `plain` to leave it out. */
export function Card({ style, children, soft, plain, pattern }: { style?: StyleProp<ViewStyle>; children?: React.ReactNode; soft?: boolean; plain?: boolean; pattern?: TermehPattern }) {
  return (
    <View style={[styles.card, soft && { backgroundColor: 'rgba(255,240,220,0.045)' }, style]}>
      {plain ? null : <Termeh pattern={pattern} />}
      {children}
    </View>
  );
}

export function IconBtn({ name, onPress, size = 20, color = C.text, style, filled, label }: {
  name: keyof typeof Feather.glyphMap; onPress?: () => void; size?: number; color?: string; style?: StyleProp<ViewStyle>; filled?: boolean; label?: string;
}) {
  return (
    <Pressy bloom={filled} onPress={onPress} scaleTo={0.88} style={[styles.iconBtn, filled && { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong }, style]} accessibilityLabel={label}>
      <Feather name={name} size={size} color={color} />
    </Pressy>
  );
}

export function Chip({ label, active, onPress, color, icon }: { label: string; active?: boolean; onPress?: () => void; color?: string; icon?: keyof typeof Feather.glyphMap }) {
  const on = useSharedValue(active ? 1 : 0);
  React.useEffect(() => {
    on.value = withTiming(active ? 1 : 0, { duration: 220 });
  }, [active]);
  const a = useAnimatedStyle(() => ({
    backgroundColor: on.value > 0.5 ? (color ? `${color}33` : C.zarSoft) : 'rgba(255,240,220,0.07)',
    borderColor: on.value > 0.5 ? (color ?? C.zar) + 'AA' : C.lineStrong,
  }));
  return (
    <Pressy onPress={() => { tap('select'); onPress?.(); }} haptic={false} scaleTo={0.94}>
      <Animated.View style={[styles.chip, a]}>
        {icon ? <Feather name={icon} size={15} color={active ? color ?? C.zarBright : C.zar} style={{ marginLeft: 6 }} /> : null}
        <Txt v="small" color={active ? color ?? C.zarBright : C.text}>{label}</Txt>
      </Animated.View>
    </Pressy>
  );
}

export function Badge({ label, color = C.accent }: { label: string; color?: string }) {
  return (
    <View style={[styles.badge, { borderColor: `${color}55`, backgroundColor: `${color}14` }]}>
      <Txt v="caption" color={color} style={{ lineHeight: 15 }}>{label}</Txt>
    </View>
  );
}

export function Section({ title, action, onAction, children, style }: { title: string; action?: string; onAction?: () => void; children?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <Animated.View entering={unfold(60)} style={[{ marginTop: 30 }, style]}>
      <View style={[row, { justifyContent: 'space-between', paddingHorizontal: 22, marginBottom: 12 }]}>
        <View style={[row, { gap: 8 }]}>
          <Boteh size={17} opacity={1} color={C.zarBright} />
          <Txt v="label" color={C.zarBright} style={{ fontSize: 14 }}>{title}</Txt>
        </View>
        {action ? (
          <Pressy onPress={onAction} scaleTo={0.92}>
            <Txt v="small" color={C.accent}>{action}</Txt>
          </Pressy>
        ) : null}
      </View>
      {children}
    </Animated.View>
  );
}

export function Empty({ icon = 'music', title, hint, action, onAction }: { icon?: keyof typeof Feather.glyphMap; title: string; hint?: string; action?: string; onAction?: () => void }) {
  return (
    <Animated.View entering={FadeIn.duration(600)} style={{ alignItems: 'center', paddingVertical: 48, paddingHorizontal: 36 }}>
      <View style={{ width: 120, height: 120, alignItems: 'center', justifyContent: 'center' }}>
        <Rosette size={120} opacity={0.35} style={{ position: 'absolute' }} />
        <View style={styles.emptyIcon}>
          <Feather name={icon} size={22} color={C.zar} />
        </View>
      </View>
      <Txt v="h3" center style={{ marginTop: 16 }}>{title}</Txt>
      {hint ? <Txt v="small" center style={{ marginTop: 6 }}>{hint}</Txt> : null}
      {action ? <Button label={action} onPress={onAction} style={{ marginTop: 20 }} /> : null}
    </Animated.View>
  );
}

export function Button({ label, onPress, icon, kind = 'primary', style, loading, disabled }: {
  label: string; onPress?: () => void; icon?: keyof typeof Feather.glyphMap; kind?: 'primary' | 'ghost' | 'danger'; style?: StyleProp<ViewStyle>; loading?: boolean; disabled?: boolean;
}) {
  const bg = kind === 'primary' ? C.accent : 'rgba(255,255,255,0.05)';
  const fg = kind === 'primary' ? '#141312' : kind === 'danger' ? C.danger : C.text;
  return (
    <Pressy bloom onPress={disabled || loading ? undefined : onPress} style={[styles.button, { backgroundColor: bg, opacity: disabled ? 0.4 : 1 }, kind !== 'primary' && { borderWidth: StyleSheet.hairlineWidth, borderColor: C.lineStrong }, style]}>
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <>
          {icon ? <Feather name={icon} size={16} color={fg} style={{ marginLeft: 8 }} /> : null}
          <Txt v="h3" color={fg} style={{ fontSize: 15.5 }}>{label}</Txt>
        </>
      )}
    </Pressy>
  );
}

export function Header({ title, subtitle, right, back = true, transparent }: { title?: string; subtitle?: string; right?: React.ReactNode; back?: boolean; transparent?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[row, { paddingTop: insets.top + 8, paddingHorizontal: 14, paddingBottom: 8, justifyContent: 'space-between', backgroundColor: transparent ? 'transparent' : undefined }]}>
      <View style={[row, { flex: 1 }]}>
        {back ? <IconBtn name="chevron-right" size={26} color={C.zarBright} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} label="بازگشت" /> : null}
        <View style={{ flex: 1, marginRight: back ? 4 : 8 }}>
          {title ? <Txt v="h2" numberOfLines={1}>{title}</Txt> : null}
          {subtitle ? <Txt v="caption" numberOfLines={1}>{subtitle}</Txt> : null}
        </View>
      </View>
      <View style={[row, { gap: 4 }]}>{right}</View>
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[{ height: StyleSheet.hairlineWidth, backgroundColor: C.line, marginHorizontal: 22 }, style]} />;
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
      <ActivityIndicator color={C.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    borderWidth: 1,
    borderColor: C.line,
    overflow: 'hidden',
  },
  iconBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 38,
    borderRadius: R.pill,
    borderWidth: 1,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: StyleSheet.hairlineWidth, alignSelf: 'flex-start' },
  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  button: { height: 48, borderRadius: R.pill, paddingHorizontal: 22, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center' },
});
