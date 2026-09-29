import { getLang } from './i18n';
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

/** Persian digits, and the Persian decimal separator (٫) between digits. */
export function toFa(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  // In the English interface numbers stay in Latin digits.
  if (getLang() === 'en') return String(v).replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)));
  return String(v)
    .replace(/(\d)\.(\d)/g, '$1٫$2')
    .replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  return `${prefix}${Date.now().toString(36)}${r}`;
}

export const now = () => Date.now();

export function fmtTime(sec: number | null | undefined): string {
  if (!sec || !isFinite(sec) || sec < 0) return toFa('0:00');
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return toFa(h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`);
}

export function fmtMinutes(sec: number): string {
  const m = Math.round(sec / 60);
  if (m < 60) return `${toFa(m)} دقیقه`;
  const h = Math.floor(m / 60);
  return `${toFa(h)} ساعت و ${toFa(m % 60)} دقیقه`;
}

export function normalizeFa(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\u200c\u200f\u200e]/g, '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function matches(q: string, ...fields: (string | null | undefined)[]): boolean {
  const nq = normalizeFa(q);
  if (!nq) return true;
  return fields.some((f) => normalizeFa(f).includes(nq));
}

export function parseList(v: string | null | undefined): string[] {
  if (!v) return [];
  try {
    const x = JSON.parse(v);
    return Array.isArray(x) ? x.filter((i) => typeof i === 'string') : [];
  } catch {
    return [];
  }
}

export function yearsLabel(born?: string | null, died?: string | null): string {
  if (!born && !died) return '';
  if (born && died) return `${toFa(born)} - ${toFa(died)}`;
  if (born) return `زادهٔ ${toFa(born)}`;
  return `درگذشت ${toFa(died)}`;
}

export function yearOf(v?: string | null): number | null {
  if (!v) return null;
  const m = String(v).match(/(\d{3,4})/);
  return m ? Number(m[1]) : null;
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'شب آرام';
  if (h < 12) return 'صبح بخیر';
  if (h < 17) return 'روز بخیر';
  if (h < 21) return 'عصر بخیر';
  return 'شب بخیر';
}

export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function relTime(ts: number): string {
  const d = (Date.now() - ts) / 1000;
  if (d < 60) return 'همین حالا';
  if (d < 3600) return `${toFa(Math.floor(d / 60))} دقیقه پیش`;
  if (d < 86400) return `${toFa(Math.floor(d / 3600))} ساعت پیش`;
  if (d < 86400 * 30) return `${toFa(Math.floor(d / 86400))} روز پیش`;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { jalaliLabel } = require('./calendar');
  return jalaliLabel(new Date(ts), false);
}
