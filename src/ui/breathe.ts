import { Easing, SharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

/**
 * Starts (or re-tempos) an endless 0 ↔ 1 breath on `v` without a jump:
 * it first finishes the current half-breath at the new tempo, then repeats.
 */
export function breathe(v: SharedValue<number>, halfPeriod: number) {
  const ease = Easing.inOut(Easing.sin);
  const cur = v.value;
  const goingUp = cur < 0.5;
  const target = goingUp ? 1 : 0;
  const rest = Math.max(60, Math.abs(target - cur) * halfPeriod);
  v.value = withSequence(
    withTiming(target, { duration: rest, easing: ease }),
    withRepeat(withTiming(1 - target, { duration: halfPeriod, easing: ease }), -1, true),
  );
}
