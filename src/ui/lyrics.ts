export interface LyricLine { t: number | null; text: string }

/** Parses plain text or LRC ([mm:ss.xx] line) lyrics. */
export function parseLyrics(src: string | null | undefined): { lines: LyricLine[]; synced: boolean } {
  if (!src) return { lines: [], synced: false };
  const out: LyricLine[] = [];
  let synced = false;
  for (const raw of src.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d{1,2}):(\d{1,2}(?:[.,]\d{1,3})?)\]/g)];
    const text = raw.replace(/\[[^\]]*\]/g, '').trim();
    if (stamps.length) {
      synced = true;
      for (const m of stamps) out.push({ t: Number(m[1]) * 60 + Number(m[2].replace(',', '.')), text });
    } else if (!/^\[[a-z]+:/i.test(raw)) {
      out.push({ t: null, text: raw.trim() });
    }
  }
  if (synced) out.sort((a, b) => (a.t ?? 0) - (b.t ?? 0));
  return { lines: out, synced };
}

export function activeLine(lines: LyricLine[], pos: number): number {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].t !== null && (lines[i].t as number) <= pos + 0.25) idx = i;
  }
  return idx;
}
