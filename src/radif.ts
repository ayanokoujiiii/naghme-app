/**
 * «ردیف موسیقی دستگاهی ایران»
 *
 * The radif is organised as 7 dastgahs (دستگاه). Five «آواز»es are branches:
 * ابوعطا، بیات ترک، افشاری و دشتی from شور, and بیات اصفهان from همایون;
 * many sources also count بیات کرد among the branches of شور.
 * Each dastgah or avaz is a chain of gushes (گوشه). The lists below follow the
 * best-known gushes of the radif of Mirza Abdollah; other radifs (Mousa Maroufi,
 * Karimi, Saba…) differ in names and order, so a custom gushe can always be typed.
 */
export interface RadifNode {
  name: string;
  kind: 'dastgah' | 'avaz';
  parent?: string;
  gushes: string[];
}

export const RADIF: RadifNode[] = [
  {
    name: 'شور', kind: 'dastgah',
    gushes: ['درآمد', 'کرشمه', 'رهاب', 'سلمک', 'زیرکش سلمک', 'گلریز', 'مجلس‌افروز', 'ملانازی', 'بزرگ', 'شهناز', 'قرچه', 'رضوی', 'حسینی', 'گریلی'],
  },
  { name: 'ابوعطا', kind: 'avaz', parent: 'شور', gushes: ['درآمد', 'رامکلی', 'حجاز', 'سارنج', 'چهارباغ'] },
  { name: 'بیات ترک', kind: 'avaz', parent: 'شور', gushes: ['درآمد', 'دوگاه', 'جامه‌دران', 'مهدی‌ضرابی', 'شکسته', 'قطار', 'فیلی'] },
  { name: 'افشاری', kind: 'avaz', parent: 'شور', gushes: ['درآمد', 'جامه‌دران', 'عراق', 'رهاب', 'قرائی'] },
  { name: 'دشتی', kind: 'avaz', parent: 'شور', gushes: ['درآمد', 'غم‌انگیز', 'عشاق', 'اوج', 'گیلکی', 'دشتستانی', 'چوپانی'] },
  { name: 'بیات کرد', kind: 'avaz', parent: 'شور', gushes: ['درآمد', 'کرد'] },
  {
    name: 'ماهور', kind: 'dastgah',
    gushes: ['درآمد', 'داد', 'خسروانی', 'دلکش', 'شکسته', 'عراق', 'محیر', 'آشورآوند', 'راک', 'ساقی‌نامه', 'صوفی‌نامه', 'نصیرخانی'],
  },
  {
    name: 'همایون', kind: 'dastgah',
    gushes: ['درآمد', 'چکاوک', 'لیلی و مجنون', 'طرز', 'بیداد', 'نی‌داوود', 'شوشتری', 'موالیان', 'نوروز عرب', 'نوروز صبا', 'بختیاری', 'عشاق'],
  },
  { name: 'بیات اصفهان', kind: 'avaz', parent: 'همایون', gushes: ['درآمد', 'بیات راجه', 'جامه‌دران', 'سوز و گداز', 'عشاق'] },
  { name: 'سه‌گاه', kind: 'dastgah', gushes: ['درآمد', 'کرشمه', 'زابل', 'مویه', 'مخالف', 'مغلوب', 'حصار', 'حزین'] },
  { name: 'چهارگاه', kind: 'dastgah', gushes: ['درآمد', 'زابل', 'مویه', 'حصار', 'مخالف', 'مغلوب', 'منصوری', 'حدی', 'پهلوی', 'رجز'] },
  {
    name: 'نوا', kind: 'dastgah',
    gushes: ['درآمد', 'نغمه', 'گردانیه', 'بیات راجه', 'عشاق', 'حسینی', 'نهفت', 'خجسته', 'عراق', 'نیشابورک', 'ملک حسین', 'تخت طاقدیس'],
  },
  {
    name: 'راست‌پنجگاه', kind: 'dastgah',
    gushes: ['درآمد', 'پروانه', 'زنگوله', 'روح‌افزا', 'پنجگاه', 'سپهر', 'عشاق', 'بحر نور', 'نیریز', 'راک', 'ماوراءالنهر'],
  },
];

export const DASTGAH_LIST = RADIF.filter((r) => r.kind === 'dastgah').map((r) => r.name);
export const AVAZ_LIST = RADIF.filter((r) => r.kind === 'avaz').map((r) => r.name);

/** Old records saved «اصفهان» before v1.1. */
export function normalizeAvaz(a?: string | null): string | null {
  if (!a) return null;
  return a === 'اصفهان' ? 'بیات اصفهان' : a;
}

export function avazesOf(dastgah?: string | null): string[] {
  return RADIF.filter((r) => r.kind === 'avaz' && r.parent === dastgah).map((r) => r.name);
}

export function parentOf(avaz?: string | null): string | null {
  const a = normalizeAvaz(avaz);
  return RADIF.find((r) => r.name === a)?.parent ?? null;
}

export function gushesOf(dastgah?: string | null, avaz?: string | null): string[] {
  const a = normalizeAvaz(avaz);
  const node = RADIF.find((r) => r.name === (a || dastgah));
  return node?.gushes ?? [];
}

/** Does a work belong to this dastgah (directly or through one of its avazes)? */
export function inDastgah(work: { dastgah?: string | null; avaz?: string | null }, dastgah: string): boolean {
  return work.dastgah === dastgah || parentOf(work.avaz) === dastgah;
}
