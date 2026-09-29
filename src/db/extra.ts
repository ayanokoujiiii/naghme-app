import { getDb, notifyChange } from './index';
import { RecordingRow } from './repo';
import { now, uid } from '../utils';

/* Recording select, kept in sync with repo.ts */
const REC = `
SELECT r.*,
  w.title AS workTitle, w.lyrics AS workLyrics, w.poster AS workPoster,
  al.title AS albumTitle, al.cover AS albumCover,
  (SELECT GROUP_CONCAT(a.name, '، ') FROM credits c JOIN artists a ON a.id = c.artistId
     WHERE c.recordingId = r.id AND c.role IN ('vocalist','performer','ensemble','conductor')) AS performers,
  (SELECT GROUP_CONCAT(a.name, '، ') FROM credits c JOIN artists a ON a.id = c.artistId
     WHERE c.workId = r.workId AND c.workId IS NOT NULL AND c.role = 'composer') AS composers,
  (SELECT a.photo FROM credits c JOIN artists a ON a.id = c.artistId
     WHERE (c.recordingId = r.id OR (c.workId = r.workId AND c.workId IS NOT NULL)) AND a.photo IS NOT NULL LIMIT 1) AS artistPhoto
FROM recordings r
LEFT JOIN works w ON w.id = r.workId
LEFT JOIN albums al ON al.id = r.albumId
`;

/* ---------- local recommendations (no internet, no key) ---------- */

export interface Suggestion { rec: RecordingRow; reason: string }

/**
 * Suggestions built only from the archive itself: other performances of what
 * you just heard, the same dastgah, the same artists, and pieces waiting to be
 * heard for the first time. Night hours lean towards calm pieces.
 */
export async function suggestions(limit = 10): Promise<Suggestion[]> {
  const db = await getDb();
  const out: Suggestion[] = [];
  const seen = new Set<string>();
  const push = (rows: RecordingRow[], reason: string, max: number) => {
    let n = 0;
    for (const r of rows) {
      if (out.length >= limit || n >= max) break;
      if (!r.audioUri || seen.has(r.id)) continue;
      seen.add(r.id);
      out.push({ rec: r, reason });
      n++;
    }
  };
  const last = await db.getFirstAsync<{ recordingId: string; title: string; workId: string | null; workTitle: string | null; dastgah: string | null; avaz: string | null }>(`
    SELECT h.recordingId, r.title, r.workId, w.title AS workTitle, w.dastgah, w.avaz FROM history h
    JOIN recordings r ON r.id = h.recordingId LEFT JOIN works w ON w.id = r.workId
    ORDER BY h.playedAt DESC LIMIT 1`);
  if (last) seen.add(last.recordingId);
  if (last?.workId) {
    push(await db.getAllAsync<RecordingRow>(`${REC} WHERE r.workId = ? AND r.id != ? LIMIT 4`, [last.workId, last.recordingId]), `اجرای دیگری از «${last.workTitle ?? last.title}»`, 2);
  }
  const mode = last?.dastgah || last?.avaz;
  if (mode) {
    push(await db.getAllAsync<RecordingRow>(`${REC} WHERE (w.dastgah = ? OR w.avaz = ?) ORDER BY RANDOM() LIMIT 6`, [mode, mode]), `هم‌حال‌وهوا، در ${mode}`, 3);
  }
  if (last) {
    push(await db.getAllAsync<RecordingRow>(`${REC}
      WHERE r.id IN (
        SELECT c2.recordingId FROM credits c1 JOIN credits c2 ON c1.artistId = c2.artistId
        WHERE c1.recordingId = ? AND c2.recordingId IS NOT NULL
      ) ORDER BY RANDOM() LIMIT 6`, [last.recordingId]), 'از همان هنرمندان', 3);
  }
  push(await db.getAllAsync<RecordingRow>(`${REC} WHERE r.playCount = 0 ORDER BY RANDOM() LIMIT 6`), 'هنوز نشنیده‌ای', 3);
  const h = new Date().getHours();
  if (h >= 21 || h < 5) {
    push(await db.getAllAsync<RecordingRow>(`${REC}
      WHERE r.id IN (SELECT recordingId FROM journal WHERE mood IN ('آرام', 'دلتنگ', 'متفکر') AND recordingId IS NOT NULL)
      ORDER BY RANDOM() LIMIT 4`), 'برای آرامش شب', 2);
  }
  push(await db.getAllAsync<RecordingRow>(`${REC} WHERE r.favorite = 1 ORDER BY RANDOM() LIMIT 6`), 'از برگزیده‌هایت', 3);
  return out;
}

/* ---------- listening history ---------- */

export interface HistoryRow extends RecordingRow { historyId: string; playedAt: number; listened: number; completion: number | null }

export async function listHistory(limit = 300): Promise<HistoryRow[]> {
  const db = await getDb();
  return db.getAllAsync<HistoryRow>(`
    SELECT x.*, h.id AS historyId, h.playedAt, h.listened, h.completion FROM history h
    JOIN (${REC}) x ON x.id = h.recordingId
    ORDER BY h.playedAt DESC LIMIT ?`, [limit]);
}

export async function removeHistory(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM history WHERE id = ?', [id]);
  notifyChange();
}

export async function clearHistory() {
  const db = await getDb();
  await db.runAsync('DELETE FROM history');
  notifyChange();
}

export async function historyTotals(): Promise<{ plays: number; seconds: number; days: number }> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ plays: number; seconds: number; first: number | null }>('SELECT COUNT(*) AS plays, COALESCE(SUM(listened), 0) AS seconds, MIN(playedAt) AS first FROM history');
  const days = r?.first ? Math.max(1, Math.round((Date.now() - r.first) / 86400000)) : 0;
  return { plays: r?.plays ?? 0, seconds: r?.seconds ?? 0, days };
}

/* ---------- postcards ---------- */

export interface Postcard {
  id: string;
  title: string;
  text: string;
  recordingId: string | null;
  workId: string | null;
  settings: string;
  preview: string | null;
  createdAt: number;
  updatedAt: number;
}

export async function listPostcards(): Promise<Postcard[]> {
  const db = await getDb();
  return db.getAllAsync<Postcard>('SELECT * FROM postcards ORDER BY updatedAt DESC');
}

export async function getPostcard(id: string): Promise<Postcard | null> {
  const db = await getDb();
  return db.getFirstAsync<Postcard>('SELECT * FROM postcards WHERE id = ?', [id]);
}

export async function savePostcard(p: Partial<Postcard> & { title: string }): Promise<string> {
  const db = await getDb();
  const id = p.id || uid('pc_');
  const t = now();
  await db.runAsync(
    `INSERT INTO postcards (id, title, text, recordingId, workId, settings, preview, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, text = excluded.text, recordingId = excluded.recordingId,
       workId = excluded.workId, settings = excluded.settings, preview = excluded.preview, updatedAt = excluded.updatedAt`,
    [id, p.title, p.text ?? '', p.recordingId ?? null, p.workId ?? null, p.settings ?? '{}', p.preview ?? null, p.createdAt ?? t, t],
  );
  notifyChange();
  return id;
}

export async function deletePostcard(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM postcards WHERE id = ?', [id]);
  notifyChange();
}

/* ---------- conversations ---------- */

export interface Conversation { id: string; title: string; messages: string; createdAt: number; updatedAt: number }

export async function listConversations(): Promise<Conversation[]> {
  const db = await getDb();
  return db.getAllAsync<Conversation>('SELECT * FROM conversations ORDER BY updatedAt DESC');
}

export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await getDb();
  return db.getFirstAsync<Conversation>('SELECT * FROM conversations WHERE id = ?', [id]);
}

export async function saveConversation(c: { id?: string; title: string; messages: unknown[] }): Promise<string> {
  const db = await getDb();
  const id = c.id || uid('cv_');
  const t = now();
  await db.runAsync(
    `INSERT INTO conversations (id, title, messages, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET title = excluded.title, messages = excluded.messages, updatedAt = excluded.updatedAt`,
    [id, c.title, JSON.stringify(c.messages), t, t],
  );
  notifyChange();
  return id;
}

export async function deleteConversation(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM conversations WHERE id = ?', [id]);
  notifyChange();
}

/* ---------- full restore ---------- */

export const ALL_TABLES = ['artists', 'works', 'albums', 'recordings', 'credits', 'relations', 'timeline', 'journal', 'collections', 'collection_items', 'history', 'postcards', 'conversations'];

/** Empty the whole archive before a "replace" restore. Settings are kept. */
export async function wipeArchive() {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const t of [...ALL_TABLES].reverse()) await db.runAsync(`DELETE FROM ${t}`);
  });
  notifyChange();
}
