import { useEffect } from 'react';
import { create } from 'zustand';
import { toJalali } from './calendar';

/**
 * Mood of the day. Three of Naghme's ideas live here:
 *  - رنگ آسمان: the ambient light follows the sky (سحر، صبح، ظهرِ کویر، غروب، شب).
 *  - پوستهٔ جشن: on ancient Iranian festivals the light and a small emblem change.
 *  - کشش زمان: while listening deeply, every slow motion in the app stretches out.
 */

export type SkyKey = 'sahar' | 'sobh' | 'kavir' | 'ghoroob' | 'shab';
export type FestivalKey = 'nowruz' | 'sizdah' | 'tirgan' | 'mehregan' | 'yalda' | 'sadeh' | 'suri';
export type Emblem = 'sabzeh' | 'water' | 'sun' | 'pomegranate' | 'flame';

export interface Sky { key: SkyKey; label: string; tint: string; second: string }
export interface Festival { key: FestivalKey; label: string; line: string; tint: string; second: string; emblem: Emblem }

export const SKIES: Record<SkyKey, Sky> = {
  sahar: { key: 'sahar', label: 'سحر', tint: '#8FA3C4', second: '#C9A7A0' },
  sobh: { key: 'sobh', label: 'صبح', tint: '#D6C8B2', second: '#A9BCCB' },
  kavir: { key: 'kavir', label: 'ظهرِ کویر', tint: '#D8B27A', second: '#C98F5A' },
  ghoroob: { key: 'ghoroob', label: 'غروب', tint: '#D98C5F', second: '#9C6FA0' },
  shab: { key: 'shab', label: 'شب', tint: '#6F7FB0', second: '#9C8FA8' },
};

/** Sunrise and sunset move with the Iranian seasons (roughly, for Tehran). */
function sunTimes(month: number): { rise: number; set: number } {
  // Iran has no daylight saving time any more (since 1401).
  const table: [number, number][] = [
    [5.8, 18.5], [5.2, 19.0], [4.9, 19.4], [4.9, 19.4], [5.3, 19.1], [5.7, 18.5],
    [6.0, 17.8], [6.5, 17.2], [7.0, 16.9], [7.2, 17.0], [7.0, 17.5], [6.4, 18.0],
  ];
  const [rise, set] = table[Math.max(0, Math.min(11, month - 1))];
  return { rise, set };
}

export function skyAt(date: Date = new Date()): Sky {
  const [, m] = toJalali(date);
  const { rise, set } = sunTimes(m);
  const h = date.getHours() + date.getMinutes() / 60;
  if (h >= rise - 1.2 && h < rise + 0.8) return SKIES.sahar;
  if (h >= rise + 0.8 && h < 11) return SKIES.sobh;
  if (h >= 11 && h < set - 1.3) return SKIES.kavir;
  if (h >= set - 1.3 && h < set + 0.7) return SKIES.ghoroob;
  return SKIES.shab;
}

export function festivalAt(date: Date = new Date()): Festival | null {
  const [, m, d] = toJalali(date);
  if (m === 1 && d <= 12) return { key: 'nowruz', label: 'نوروز', line: 'نوروزت پیروز', tint: '#7FB069', second: '#E3C567', emblem: 'sabzeh' };
  if (m === 1 && d === 13) return { key: 'sizdah', label: 'سیزده‌به‌در', line: 'سیزده‌به‌در · روز طبیعت', tint: '#8DBF73', second: '#A9BCCB', emblem: 'sabzeh' };
  if (m === 4 && d >= 10 && d <= 13) return { key: 'tirgan', label: 'تیرگان', line: 'جشن تیرگان · جشن آب', tint: '#6FA8C7', second: '#A9D3E0', emblem: 'water' };
  if (m === 7 && d >= 10 && d <= 16) return { key: 'mehregan', label: 'مهرگان', line: 'جشن مهرگان · جشن مهر و پاییز', tint: '#D9A441', second: '#C4703A', emblem: 'sun' };
  if (m === 9 && d >= 25) return { key: 'yalda', label: 'شب یلدا', line: 'شب یلدا · بلندترین شب سال', tint: '#B23A48', second: '#6F2A3A', emblem: 'pomegranate' };
  if (m === 11 && d >= 8 && d <= 10) return { key: 'sadeh', label: 'سده', line: 'جشن سده · جشن آتش', tint: '#E08A3C', second: '#B5532E', emblem: 'flame' };
  if (m === 12 && d >= 24 && date.getDay() === 2) return { key: 'suri', label: 'چهارشنبه‌سوری', line: 'شب چهارشنبه‌سوری', tint: '#E07A3F', second: '#C4453A', emblem: 'flame' };
  return null;
}

interface MoodState {
  sky: Sky;
  festival: Festival | null;
  /** The player is open and the music is playing. */
  deep: boolean;
  setDeep: (v: boolean) => void;
  tick: () => void;
}

export const useMood = create<MoodState>((set) => ({
  sky: skyAt(),
  festival: festivalAt(),
  deep: false,
  setDeep: (deep) => set({ deep }),
  tick: () => {
    const now = new Date();
    set({ sky: skyAt(now), festival: festivalAt(now) });
  },
}));

let clock: ReturnType<typeof setInterval> | null = null;
/** One clock for the whole app; the sky is checked once a minute. */
export function startMoodClock() {
  if (clock) return;
  useMood.getState().tick();
  clock = setInterval(() => useMood.getState().tick(), 60000);
}

/** The light of this moment: a festival overrides the sky. */
export function useTint(): { tint: string; second: string } {
  const sky = useMood((s) => s.sky);
  const fest = useMood((s) => s.festival);
  return fest ? { tint: fest.tint, second: fest.second } : { tint: sky.tint, second: sky.second };
}

/** «کشش زمان»: slow motions last this many times longer during deep listening. */
export const STRETCH = 1.8;
export function useStretch(): number {
  return useMood((s) => (s.deep ? STRETCH : 1));
}

/** Marks a screen as a place of deep listening while `active` is true. */
export function useDeepListening(active: boolean) {
  const setDeep = useMood((s) => s.setDeep);
  useEffect(() => {
    setDeep(active);
    return () => setDeep(false);
  }, [active]);
}
