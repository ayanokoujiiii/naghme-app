import { getSetting } from '../db/repo';
import { getLang } from '../i18n';

export interface ChatMsg { role: 'user' | 'model'; text: string }

export const DEFAULT_MODEL = 'gemini-2.5-flash';

export interface GeminiModel { id: string; name: string }

/** Models this key can use for text generation. */
export async function listGeminiModels(key: string): Promise<GeminiModel[]> {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?pageSize=100&key=${encodeURIComponent(key.trim())}`);
  if (!res.ok) throw new Error('فهرست مدل‌ها دریافت نشد. کلید را بررسی کن.');
  const j = await res.json();
  return (j?.models ?? [])
    .filter((m: any) => (m.supportedGenerationMethods ?? []).includes('generateContent') && /gemini/i.test(m.name))
    .map((m: any) => ({ id: String(m.name).replace(/^models\//, ''), name: m.displayName ?? m.name }));
}

const SYSTEM = `تو «نغمه» هستی، همراه آرام و دانای یک آرشیو شخصی موسیقی سنتی ایران و موسیقی کلاسیک.
کوتاه، دقیق و گرم پاسخ بده، به فارسی روان. دربارهٔ دستگاه‌ها، گوشه‌ها، فرم‌ها، هنرمندان و تاریخچهٔ آثار توضیح بده.
اگر از چیزی مطمئن نیستی صادقانه بگو و حدس نزن. پیشنهاد شنیدن را بر اساس آرشیو کاربر بده.`;

export async function askGemini(history: ChatMsg[], archiveContext: string): Promise<string> {
  const key = (await getSetting('geminiKey'))?.trim();
  if (!key) throw new Error('برای گفت‌وگو، کلید Gemini را در تنظیمات وارد کن.');
  const model = ((await getSetting('geminiModel')) || DEFAULT_MODEL).replace(/^models\//, '');
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${SYSTEM}${getLang() === 'en' ? '\nThe user has chosen English: answer in clear English, keeping Persian musical terms (dastgah, avaz, gousheh) in transliteration.' : ''}\n\nآرشیو کاربر:\n${archiveContext}` }] },
      contents: history.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
      generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
    }),
  });
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error('کلید Gemini معتبر نیست یا دسترسی ندارد.');
    throw new Error('ارتباط با Gemini برقرار نشد.');
  }
  const j = await res.json();
  const text = j?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? '';
  return text.trim() || 'پاسخی دریافت نشد.';
}
