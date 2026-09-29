/** Small helpers to enrich the archive from public encyclopedias (needs internet on the phone). */

export interface WikiSummary { extract: string; image: string | null; url: string | null; lang: string }

async function summary(lang: string, title: string): Promise<WikiSummary | null> {
  const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, '_'))}`, {
    headers: { Accept: 'application/json', 'Api-User-Agent': 'Naghme/1.0 (personal music archive)' },
  });
  if (!res.ok) return null;
  const j = await res.json();
  if (!j?.extract || j.type === 'disambiguation') return null;
  return {
    extract: j.extract as string,
    image: j.originalimage?.source ?? j.thumbnail?.source ?? null,
    url: j.content_urls?.mobile?.page ?? null,
    lang,
  };
}

async function searchTitle(lang: string, q: string): Promise<string | null> {
  const res = await fetch(`https://${lang}.wikipedia.org/w/api.php?action=opensearch&limit=1&namespace=0&format=json&search=${encodeURIComponent(q)}`);
  if (!res.ok) return null;
  const j = await res.json();
  return j?.[1]?.[0] ?? null;
}

/** Try Persian Wikipedia with the Persian name, then English with the Latin name. */
export async function fetchArtistSummary(name: string, nameLatin?: string | null): Promise<WikiSummary | null> {
  const tries: [string, string | null | undefined][] = [['fa', name], ['en', nameLatin], ['en', name]];
  for (const [lang, q] of tries) {
    if (!q?.trim()) continue;
    try {
      const direct = await summary(lang, q.trim());
      if (direct) return direct;
      const t = await searchTitle(lang, q.trim());
      if (t) {
        const s = await summary(lang, t);
        if (s) return s;
      }
    } catch {
      /* try the next source */
    }
  }
  return null;
}

/** Birth / death years from MusicBrainz, useful for classical composers. */
export async function fetchLifeSpan(name: string): Promise<{ born?: string; died?: string; kind?: string } | null> {
  try {
    const res = await fetch(`https://musicbrainz.org/ws/2/artist/?query=${encodeURIComponent(`artist:"${name}"`)}&fmt=json&limit=1`, {
      headers: { 'User-Agent': 'Naghme/1.0 (personal music archive)', Accept: 'application/json' },
    });
    if (!res.ok) return null;
    const j = await res.json();
    const a = j?.artists?.[0];
    if (!a || (a.score ?? 0) < 85) return null;
    return {
      born: a['life-span']?.begin?.slice(0, 4),
      died: a['life-span']?.end?.slice(0, 4),
      kind: a.type === 'Group' || a.type === 'Orchestra' || a.type === 'Choir' ? 'ensemble' : 'person',
    };
  } catch {
    return null;
  }
}
