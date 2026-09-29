import { Alert } from 'react-native';
import { create } from 'zustand';
import { EN, EN_PATTERNS } from './en';

/**
 * «دوزبانه»: Naghme speaks Persian first; English is an option in Settings.
 * The Persian text written in the screens is itself the key: `tr()` looks it up
 * in the English dictionary (exact lines first, then patterns with values such
 * as numbers and names). Txt, placeholders and alerts all go through it, so a
 * screen never has to know which language is on. Users' own data (names,
 * poems, notes) is never translated.
 */
export type Lang = 'fa' | 'en';

export const useLang = create<{ lang: Lang }>(() => ({ lang: 'fa' }));
export const getLang = (): Lang => useLang.getState().lang;
export function setLangNow(lang: Lang) {
  cache.clear();
  useLang.setState({ lang });
}

const esc = (s: string) => s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&');
const compiled: [RegExp, string][] = EN_PATTERNS.map(([k, v]) => [new RegExp(`^${k.split('{}').map(esc).join('([\\s\\S]*?)')}$`), v]);

const FA_DIGITS = /[۰-۹]/g;
const latinDigits = (s: string) =>
  s.replace(FA_DIGITS, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/(\d)٫(\d)/g, '$1.$2').replace(/٪/g, '%').replace(/؟/g, '?');

function translate(s: string, depth = 0): string {
  const t = s.trim();
  if (!t) return s;
  const hit = EN[t];
  if (hit !== undefined) return s.replace(t, hit);
  if (depth < 3) {
    for (const [re, v] of compiled) {
      const m = t.match(re);
      if (m) {
        let i = 1;
        return v.replace(/\{\}/g, () => translate(m[i++] ?? '', depth + 1));
      }
    }
    for (const sep of [' · ', '، ', '\n']) {
      if (t.includes(sep)) {
        const parts = t.split(sep);
        return parts.map((p) => translate(p, depth + 1)).join(sep === '، ' ? ', ' : sep);
      }
    }
  }
  const q = t.match(/^«([\s\S]*)»$/);
  if (q) return `“${translate(q[1], depth + 1)}”`;
  return s;
}

const cache = new Map<string, string>();

/** Translate a Persian interface string into the current language. Non-strings pass through. */
export function tr<T>(s: T): T {
  if (typeof s !== 'string' || !s || getLang() === 'fa') return s;
  const hit = cache.get(s);
  if (hit !== undefined) return hit as unknown as T;
  const out = latinDigits(translate(s));
  if (cache.size > 4000) cache.clear();
  cache.set(s, out);
  return out as unknown as T;
}

/** Translate string children of a text element. */
export function trChildren(children: any): any {
  if (getLang() === 'fa') return children;
  if (typeof children === 'string') return tr(children);
  if (Array.isArray(children)) return children.map((c) => (typeof c === 'string' ? tr(c) : c));
  return children;
}

// Alerts are shown by the system, outside Txt: translate them on the way out.
const originalAlert = Alert.alert.bind(Alert);
(Alert as any).alert = (title: string, message?: string, buttons?: any[], options?: any) =>
  originalAlert(
    tr(title),
    message ? tr(message) : message,
    buttons?.map((b) => ({ ...b, text: b?.text ? tr(b.text) : b?.text })),
    options,
  );
