export const C = {
  bg: '#0B0B0C',
  bg2: '#111113',
  bg3: '#17171A',
  surface: 'rgba(255,255,255,0.045)',
  surface2: 'rgba(255,255,255,0.08)',
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.16)',
  text: '#ECE8E1',
  dim: '#A7A29A',
  faint: '#6F6B65',
  accent: '#D6C8B2',
  /** زر: the old gold-amber of lace, termeh and lamplight. Used for ornaments. */
  zar: '#D2A15F',
  zarSoft: 'rgba(210,161,95,0.16)',
  zarDeep: '#9E6F35',
  accentSoft: 'rgba(214,200,178,0.14)',
  persian: '#CDB68C',
  classical: '#A9BCCB',
  other: '#BDB4CC',
  danger: '#D48A7E',
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

export const DASTGAHS = ['شور', 'ماهور', 'همایون', 'سه‌گاه', 'چهارگاه', 'نوا', 'راست‌پنجگاه'];
export const AVAZES = ['ابوعطا', 'بیات ترک', 'افشاری', 'دشتی', 'اصفهان', 'بیات کرد'];
export const PERSIAN_FORMS = ['تصنیف', 'آواز', 'ضربی', 'چهارمضراب', 'پیش‌درآمد', 'رِنگ', 'تک‌نوازی'];
export const CLASSICAL_FORMS = ['سمفونی', 'سونات', 'کنسرتو', 'کوارتت', 'نوکتورن', 'اتود', 'والس', 'پرلود', 'اپرا', 'سوئیت'];
export const MOODS = ['آرام', 'دلتنگ', 'غمگین', 'شاد', 'پرشور', 'متفکر', 'عاشقانه'];
