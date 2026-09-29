import { toFa } from './utils';
import { getLang } from './i18n';

/** Solar Hijri (Jalali) calendar, the everyday calendar of Iran. */
export function toJalali(date: Date = new Date()): [number, number, number] {
  let gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export const MONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

const MONTHS_EN = ['Farvardin', 'Ordibehesht', 'Khordad', 'Tir', 'Mordad', 'Shahrivar', 'Mehr', 'Aban', 'Azar', 'Dey', 'Bahman', 'Esfand'];
const WEEKDAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function jalaliLabel(date: Date = new Date(), withWeekday = true): string {
  const [y, m, d] = toJalali(date);
  if (getLang() === 'en') {
    const e = `${d} ${MONTHS_EN[m - 1]} ${y}`;
    return withWeekday ? `${WEEKDAYS_EN[date.getDay()]}, ${e}` : e;
  }
  const s = `${toFa(d)} ${MONTHS[m - 1]} ${toFa(y)}`;
  return withWeekday ? `${WEEKDAYS[date.getDay()]} ${s}` : s;
}

/** Jalali month and year for a timestamp, used in the listening history. */
export function jalaliMonth(ts: number): string {
  const [y, m] = toJalali(new Date(ts));
  if (getLang() === 'en') return `${MONTHS_EN[m - 1]} ${y}`;
  return `${MONTHS[m - 1]} ${toFa(y)}`;
}

/** Ancient Iranian celebrations of the solar year. Secular, seasonal, shared by everyone. */
export function iranianDay(date: Date = new Date()): string | null {
  const [, m, d] = toJalali(date);
  if (m === 1 && d <= 4) return 'نوروزت پیروز';
  if (m === 1 && d === 13) return 'سیزده‌به‌در · روز طبیعت';
  if (m === 4 && d === 13) return 'جشن تیرگان';
  if (m === 7 && d === 16) return 'جشن مهرگان';
  if (m === 9 && d === 30) return 'شب یلدا · بلندترین شب سال';
  if (m === 11 && d === 10) return 'جشن سده';
  if (m === 12 && d >= 24 && date.getDay() === 2) return 'شب چهارشنبه‌سوری';
  return null;
}

/** A gentle seasonal line, following the Iranian year. */
export function seasonLine(date: Date = new Date()): string {
  const [, m] = toJalali(date);
  if (m <= 3) return 'بهار';
  if (m <= 6) return 'تابستان';
  if (m <= 9) return 'پاییز';
  return 'زمستان';
}
