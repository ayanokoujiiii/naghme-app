import { AVAZ_LIST, DASTGAH_LIST } from './radif';

export const C = {
  bg: '#0A0908',
  bg2: '#12100E',
  bg3: '#1A1714',
  // v1.1: every surface, line and secondary text is brighter so the app reads
  // well in low light and in daylight.
  surface: 'rgba(255,240,220,0.07)',
  surface2: 'rgba(255,240,220,0.12)',
  line: 'rgba(230,200,150,0.18)',
  lineStrong: 'rgba(230,200,150,0.32)',
  text: '#F5F0E8',
  dim: '#C9C1B4',
  faint: '#948B7E',
  accent: '#E6D3B3',
  /** زر: the old gold-amber of lace, termeh and lamplight. Used for ornaments. */
  zar: '#E0A95A',
  zarBright: '#F4C27A',
  zarSoft: 'rgba(224,169,90,0.22)',
  zarDeep: '#A8712F',
  /** نارنجی: the orange of pomegranate and sunset, used next to gold. */
  narenj: '#E57A3C',
  /** فیروزه: turquoise tiles, a cool counterpoint to gold. */
  firouzeh: '#4FB3A9',
  /** لاجورد: lapis blue of miniature skies. */
  lajvard: '#5B7FD0',
  /** لاکی: deep lacquer red of termeh grounds. */
  laki: '#B8433A',
  /** نقره: silver thread. */
  noghre: '#D9DEE3',
  accentSoft: 'rgba(230,211,179,0.18)',
  persian: '#E0C088',
  classical: '#B3C8DA',
  other: '#C9BFDA',
  danger: '#EE8F80',
  black: '#000000',
};

export const F = {
  light: 'Vazirmatn_300Light',
  regular: 'Vazirmatn_400Regular',
  medium: 'Vazirmatn_500Medium',
  bold: 'Vazirmatn_700Bold',
  lalezar: 'Lalezar_400Regular',
  nastaliq: 'NotoNastaliqUrdu_400Regular',
};

export const R = { sm: 10, md: 16, lg: 22, xl: 30, pill: 999 };

export type Tradition = 'persian' | 'classical' | 'other';

export const TRADITIONS: { key: Tradition; label: string }[] = [
  { key: 'persian', label: 'ایرانی' },
  { key: 'classical', label: 'کلاسیک' },
  { key: 'other', label: 'دیگر' },
];

export function traditionColor(t?: string | null): string {
  if (t === 'persian') return C.persian;
  if (t === 'classical') return C.classical;
  return C.other;
}

export function traditionLabel(t?: string | null): string {
  return TRADITIONS.find((x) => x.key === t)?.label ?? 'دیگر';
}

export const ROLES: { key: string; label: string }[] = [
  { key: 'vocalist', label: 'خواننده' },
  { key: 'composer', label: 'آهنگساز' },
  { key: 'lyricist', label: 'شاعر / ترانه‌سرا' },
  { key: 'performer', label: 'نوازنده' },
  { key: 'conductor', label: 'رهبر ارکستر' },
  { key: 'ensemble', label: 'ارکستر / گروه' },
  { key: 'arranger', label: 'تنظیم‌کننده' },
  { key: 'other', label: 'دیگر' },
];

export function roleLabel(key?: string | null): string {
  return ROLES.find((r) => r.key === key)?.label ?? 'مشارکت';
}

export const RELATION_KINDS: { key: string; label: string; reverse: string }[] = [
  { key: 'teacher', label: 'استادِ', reverse: 'شاگردِ' },
  { key: 'collaborator', label: 'همکار', reverse: 'همکار' },
  { key: 'influence', label: 'اثرگذار بر', reverse: 'اثرپذیر از' },
  { key: 'friend', label: 'دوست', reverse: 'دوست' },
  { key: 'family', label: 'خانواده', reverse: 'خانواده' },
];

export function relationLabel(kind: string, outgoing: boolean): string {
  const k = RELATION_KINDS.find((r) => r.key === kind);
  if (!k) return 'پیوند';
  return outgoing ? k.label : k.reverse;
}

/** 7 dastgahs and their avazes: see src/radif.ts for the full tree with gushes. */
export const DASTGAHS = DASTGAH_LIST;
export const AVAZES = AVAZ_LIST;
export const PERSIAN_FORMS = ['پیش‌درآمد', 'چهارمضراب', 'آواز', 'تصنیف', 'رِنگ', 'ضربی', 'تک‌نوازی', 'ساز و آواز', 'سرود'];
export const CLASSICAL_FORMS = ['سمفونی', 'سونات', 'کنسرتو', 'کوارتت', 'نوکتورن', 'اتود', 'والس', 'پرلود', 'اپرا', 'سوئیت'];
export const MOODS = ['آرام', 'دلتنگ', 'غمگین', 'شاد', 'پرشور', 'متفکر', 'عاشقانه'];
