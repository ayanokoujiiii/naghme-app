import { getDb, notifyChange } from './index';
import { now, uid, normalizeFa, parseList } from '../utils';

export interface Artist {
  id: string;
  name: string;
  nameLatin: string | null;
  tradition: string;
  kind: string;
  born: string | null;
  died: string | null;
  instruments: string | null;
  bio: string | null;
  photo: string | null;
  cover: string | null;
  gallery: string;
  source: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface ArtistListItem extends Artist {
  recCount: number;
  workCount: number;
}
export interface Work {
  id: string;
  title: string;
  titleLatin: string | null;
  tradition: string;
  form: string | null;
  catalog: string | null;
  dastgah: string | null;
  avaz: string | null;
  gousheh: string | null;
  year: string | null;
  lyrics: string | null;
  description: string | null;
  poster: string | null;
  sheetImages: string;
  sheetText: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface WorkListItem extends Work {
  composers: string | null;
  recCount: number;
}
export interface Album {
  id: string;
  title: string;
  year: string | null;
  label: string | null;
  cover: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}
export interface Recording {
  id: string;
  title: string;
  workId: string | null;
  albumId: string | null;
  discNo: number | null;
  trackNo: number | null;
  audioUri: string | null;
  originalName: string | null;
  format: string | null;
  sampleRate: number | null;
  bitDepth: number | null;
  channels: number | null;
  duration: number | null;
  year: string | null;
  cover: string | null;
  lyrics: string | null;
  notes: string | null;
  favorite: number;
  rating: number | null;
  playCount: number;
  createdAt: number;
  updatedAt: number;
}
export interface RecordingRow extends Recording {
  workTitle: string | null;
  workLyrics: string | null;
  workPoster: string | null;
  albumTitle: string | null;
  albumCover: string | null;
  performers: string | null;
  composers: string | null;
  artistPhoto: string | null;
}
export interface Credit {
  id: string;
  artistId: string;
  role: string;
  instrument: string | null;
  workId: string | null;
  recordingId: string | null;
  albumId: string | null;
  artistName?: string;
  artistPhoto?: string | null;
}
export interface Relation {
  id: string;
  fromId: string;
  toId: string;
  kind: string;
  note: string | null;
}
export interface TimelineEvent {
  id: string;
  artistId: string;
  date: string | null;
  title: string;
  description: string | null;
}
export interface JournalEntry {
  id: string;
  text: string;
  mood: string | null;
  recordingId: string | null;
  workId: string | null;
  artistId: string | null;
  createdAt: number;
  recordingTitle?: string | null;
  workTitle?: string | null;
  artistName?: string | null;
}
export interface Collection {
  id: string;
  title: string;
  description: string | null;
  cover: string | null;
  createdAt: number;
  updatedAt: number;
  count?: number;
}

/* ---------- helpers ---------- */

const REC_SELECT = `
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

export function recArtistLine(r: Partial<RecordingRow>): string {
  return r.performers || r.composers || '';
}
export function recCover(r: Partial<RecordingRow>): string | null {
  return r.cover || r.albumCover || r.workPoster || r.artistPhoto || null;
}

async function upsert(table: string, row: Record<string, any>) {
  const db = await getDb();
  const keys = Object.keys(row);
  const placeholders = keys.map(() => '?').join(', ');
  const updates = keys.filter((k) => k !== 'id' && k !== 'createdAt').map((k) => `${k} = excluded.${k}`).join(', ');
  await db.runAsync(
    `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})
     ON CONFLICT(id) DO UPDATE SET ${updates}`,
    keys.map((k) => (row[k] === undefined ? null : row[k])),
  );
}

/* ---------- artists ---------- */

export async function listArtists(): Promise<ArtistListItem[]> {
  const db = await getDb();
  return db.getAllAsync<ArtistListItem>(`
    SELECT a.*,
      (SELECT COUNT(DISTINCT r.id) FROM recordings r
         WHERE r.id IN (SELECT recordingId FROM credits WHERE artistId = a.id AND recordingId IS NOT NULL)
            OR r.workId IN (SELECT workId FROM credits WHERE artistId = a.id AND workId IS NOT NULL)) AS recCount,
      (SELECT COUNT(DISTINCT workId) FROM credits WHERE artistId = a.id AND workId IS NOT NULL) AS workCount
    FROM artists a ORDER BY a.name COLLATE NOCASE`);
}

export async function getArtist(id: string): Promise<Artist | null> {
  const db = await getDb();
  return db.getFirstAsync<Artist>('SELECT * FROM artists WHERE id = ?', [id]);
}

export async function saveArtist(a: Partial<Artist> & { name: string }): Promise<string> {
  const id = a.id || uid('ar_');
  const t = now();
  await upsert('artists', {
    id,
    name: a.name.trim(),
    nameLatin: a.nameLatin?.trim() || null,
    tradition: a.tradition || 'persian',
    kind: a.kind || 'person',
    born: a.born?.trim() || null,
    died: a.died?.trim() || null,
    instruments: a.instruments?.trim() || null,
    bio: a.bio?.trim() || null,
    photo: a.photo || null,
    cover: a.cover || null,
    gallery: a.gallery || '[]',
    source: a.source || null,
    createdAt: a.createdAt || t,
    updatedAt: t,
  });
  notifyChange();
  return id;
}

export async function deleteArtist(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM artists WHERE id = ?', [id]);
  notifyChange();
}

export async function findOrCreateArtist(name: string, tradition = 'persian'): Promise<string> {
  const db = await getDb();
  const all = await db.getAllAsync<{ id: string; name: string; nameLatin: string | null }>(
    'SELECT id, name, nameLatin FROM artists',
  );
  const n = normalizeFa(name);
  const hit = all.find((a) => normalizeFa(a.name) === n || normalizeFa(a.nameLatin) === n);
  if (hit) return hit.id;
  return saveArtist({ name, tradition });
}

export async function artistWorks(artistId: string): Promise<(WorkListItem & { roles: string })[]> {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT w.*, GROUP_CONCAT(DISTINCT c.role) AS roles,
      (SELECT GROUP_CONCAT(a.name, '، ') FROM credits c2 JOIN artists a ON a.id = c2.artistId
         WHERE c2.workId = w.id AND c2.role = 'composer') AS composers,
      (SELECT COUNT(*) FROM recordings r WHERE r.workId = w.id) AS recCount
    FROM works w JOIN credits c ON c.workId = w.id
    WHERE c.artistId = ? GROUP BY w.id ORDER BY w.title`, [artistId]);
}

export async function artistRecordings(artistId: string): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT}
    WHERE r.id IN (SELECT recordingId FROM credits WHERE artistId = ? AND recordingId IS NOT NULL)
       OR r.workId IN (SELECT workId FROM credits WHERE artistId = ? AND workId IS NOT NULL)
    ORDER BY r.playCount DESC, r.title`, [artistId, artistId]);
}

export async function artistAlbums(artistId: string): Promise<Album[]> {
  const db = await getDb();
  return db.getAllAsync<Album>(`
    SELECT DISTINCT al.* FROM albums al
    WHERE al.id IN (SELECT albumId FROM credits WHERE artistId = ? AND albumId IS NOT NULL)
       OR al.id IN (SELECT r.albumId FROM recordings r WHERE r.albumId IS NOT NULL AND (
            r.id IN (SELECT recordingId FROM credits WHERE artistId = ? AND recordingId IS NOT NULL)
         OR r.workId IN (SELECT workId FROM credits WHERE artistId = ? AND workId IS NOT NULL)))
    ORDER BY al.year`, [artistId, artistId, artistId]);
}

/* ---------- relations & timeline ---------- */

export interface RelationView extends Relation {
  otherId: string;
  otherName: string;
  otherPhoto: string | null;
  outgoing: boolean;
}

export async function artistRelations(artistId: string): Promise<RelationView[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<Relation & { otherName: string; otherPhoto: string | null; otherId: string; outgoing: number }>(`
    SELECT r.*, a.id AS otherId, a.name AS otherName, a.photo AS otherPhoto, 1 AS outgoing
      FROM relations r JOIN artists a ON a.id = r.toId WHERE r.fromId = ?
    UNION ALL
    SELECT r.*, a.id AS otherId, a.name AS otherName, a.photo AS otherPhoto, 0 AS outgoing
      FROM relations r JOIN artists a ON a.id = r.fromId WHERE r.toId = ?`, [artistId, artistId]);
  return rows.map((r) => ({ ...r, outgoing: !!r.outgoing }));
}

export async function allRelations(): Promise<Relation[]> {
  const db = await getDb();
  return db.getAllAsync<Relation>('SELECT * FROM relations');
}

export async function addRelation(fromId: string, toId: string, kind: string, note?: string) {
  if (fromId === toId) return;
  const db = await getDb();
  await db.runAsync(
    'INSERT OR IGNORE INTO relations (id, fromId, toId, kind, note, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [uid('rl_'), fromId, toId, kind, note || null, now()],
  );
  notifyChange();
}

export async function removeRelation(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM relations WHERE id = ?', [id]);
  notifyChange();
}

export async function artistTimeline(artistId: string): Promise<TimelineEvent[]> {
  const db = await getDb();
  return db.getAllAsync<TimelineEvent>('SELECT * FROM timeline WHERE artistId = ? ORDER BY date, createdAt', [artistId]);
}

export async function addTimeline(e: Omit<TimelineEvent, 'id'>) {
  const db = await getDb();
  await db.runAsync('INSERT INTO timeline (id, artistId, date, title, description, createdAt) VALUES (?, ?, ?, ?, ?, ?)', [
    uid('tl_'), e.artistId, e.date || null, e.title, e.description || null, now(),
  ]);
  notifyChange();
}

export async function removeTimeline(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM timeline WHERE id = ?', [id]);
  notifyChange();
}

/* ---------- works ---------- */

export async function listWorks(): Promise<WorkListItem[]> {
  const db = await getDb();
  return db.getAllAsync<WorkListItem>(`
    SELECT w.*,
      (SELECT GROUP_CONCAT(a.name, '، ') FROM credits c JOIN artists a ON a.id = c.artistId
         WHERE c.workId = w.id AND c.role = 'composer') AS composers,
      (SELECT COUNT(*) FROM recordings r WHERE r.workId = w.id) AS recCount
    FROM works w ORDER BY w.title`);
}

export async function getWork(id: string): Promise<Work | null> {
  const db = await getDb();
  return db.getFirstAsync<Work>('SELECT * FROM works WHERE id = ?', [id]);
}

export async function saveWork(w: Partial<Work> & { title: string }): Promise<string> {
  const id = w.id || uid('wk_');
  const t = now();
  await upsert('works', {
    id,
    title: w.title.trim(),
    titleLatin: w.titleLatin?.trim() || null,
    tradition: w.tradition || 'persian',
    form: w.form || null,
    catalog: w.catalog?.trim() || null,
    dastgah: w.dastgah || null,
    avaz: w.avaz || null,
    gousheh: w.gousheh?.trim() || null,
    year: w.year?.trim() || null,
    lyrics: w.lyrics || null,
    description: w.description || null,
    poster: w.poster || null,
    sheetImages: w.sheetImages || '[]',
    sheetText: w.sheetText || null,
    createdAt: w.createdAt || t,
    updatedAt: t,
  });
  notifyChange();
  return id;
}

export async function deleteWork(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM works WHERE id = ?', [id]);
  notifyChange();
}

export async function findOrCreateWork(title: string, tradition = 'persian'): Promise<string> {
  const db = await getDb();
  const all = await db.getAllAsync<{ id: string; title: string; titleLatin: string | null }>('SELECT id, title, titleLatin FROM works');
  const n = normalizeFa(title);
  const hit = all.find((w) => normalizeFa(w.title) === n || normalizeFa(w.titleLatin) === n);
  if (hit) return hit.id;
  return saveWork({ title, tradition });
}

export async function workRecordings(workId: string): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT} WHERE r.workId = ? ORDER BY r.year, r.title`, [workId]);
}

/* ---------- albums ---------- */

export async function listAlbums(): Promise<(Album & { count: number; artists: string | null })[]> {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT al.*, (SELECT COUNT(*) FROM recordings r WHERE r.albumId = al.id) AS count,
      (SELECT GROUP_CONCAT(DISTINCT a.name) FROM credits c JOIN artists a ON a.id = c.artistId
         WHERE c.recordingId IN (SELECT id FROM recordings WHERE albumId = al.id)
           AND c.role IN ('vocalist','performer','ensemble','conductor')) AS artists
    FROM albums al ORDER BY al.title`);
}

export async function getAlbum(id: string): Promise<Album | null> {
  const db = await getDb();
  return db.getFirstAsync<Album>('SELECT * FROM albums WHERE id = ?', [id]);
}

export async function saveAlbum(a: Partial<Album> & { title: string }): Promise<string> {
  const id = a.id || uid('al_');
  const t = now();
  await upsert('albums', {
    id,
    title: a.title.trim(),
    year: a.year?.trim() || null,
    label: a.label?.trim() || null,
    cover: a.cover || null,
    notes: a.notes || null,
    createdAt: a.createdAt || t,
    updatedAt: t,
  });
  notifyChange();
  return id;
}

export async function deleteAlbum(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM albums WHERE id = ?', [id]);
  notifyChange();
}

export async function findOrCreateAlbum(title: string): Promise<string> {
  const db = await getDb();
  const all = await db.getAllAsync<{ id: string; title: string }>('SELECT id, title FROM albums');
  const n = normalizeFa(title);
  const hit = all.find((a) => normalizeFa(a.title) === n);
  if (hit) return hit.id;
  return saveAlbum({ title });
}

export async function albumRecordings(albumId: string): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(
    `${REC_SELECT} WHERE r.albumId = ? ORDER BY COALESCE(r.discNo, 1), COALESCE(r.trackNo, 9999), r.createdAt`,
    [albumId],
  );
}

/* ---------- recordings ---------- */

export async function listRecordings(): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT} ORDER BY r.createdAt DESC`);
}

export async function getRecording(id: string): Promise<RecordingRow | null> {
  const db = await getDb();
  return db.getFirstAsync<RecordingRow>(`${REC_SELECT} WHERE r.id = ?`, [id]);
}

export async function saveRecording(r: Partial<Recording> & { title: string }): Promise<string> {
  const id = r.id || uid('rc_');
  const t = now();
  const db = await getDb();
  const existing = r.id ? await db.getFirstAsync<Recording>('SELECT * FROM recordings WHERE id = ?', [r.id]) : null;
  const base: any = existing || {};
  const pick = (k: keyof Recording) => (r[k] !== undefined ? r[k] : base[k] ?? null);
  await upsert('recordings', {
    id,
    title: r.title.trim(),
    workId: pick('workId'),
    albumId: pick('albumId'),
    discNo: pick('discNo'),
    trackNo: pick('trackNo'),
    audioUri: pick('audioUri'),
    originalName: pick('originalName'),
    format: pick('format'),
    sampleRate: pick('sampleRate'),
    bitDepth: pick('bitDepth'),
    channels: pick('channels'),
    duration: pick('duration'),
    year: pick('year'),
    cover: pick('cover'),
    lyrics: pick('lyrics'),
    notes: pick('notes'),
    favorite: base.favorite ?? 0,
    rating: pick('rating'),
    playCount: base.playCount ?? 0,
    createdAt: base.createdAt || t,
    updatedAt: t,
  });
  notifyChange();
  return id;
}

export async function deleteRecording(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM recordings WHERE id = ?', [id]);
  notifyChange();
}

export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await getDb();
  await db.runAsync('UPDATE recordings SET favorite = 1 - favorite WHERE id = ?', [id]);
  const r = await db.getFirstAsync<{ favorite: number }>('SELECT favorite FROM recordings WHERE id = ?', [id]);
  notifyChange();
  return !!r?.favorite;
}

export async function setDuration(id: string, duration: number) {
  const db = await getDb();
  await db.runAsync('UPDATE recordings SET duration = ? WHERE id = ? AND (duration IS NULL OR duration = 0)', [duration, id]);
}

export async function favorites(): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT} WHERE r.favorite = 1 ORDER BY r.updatedAt DESC`);
}

/* ---------- credits ---------- */

export type CreditTarget = { workId?: string; recordingId?: string; albumId?: string };

export async function creditsFor(target: CreditTarget): Promise<Credit[]> {
  const db = await getDb();
  const [col, val] = target.workId
    ? ['workId', target.workId]
    : target.recordingId
      ? ['recordingId', target.recordingId]
      : ['albumId', target.albumId];
  return db.getAllAsync<Credit>(
    `SELECT c.*, a.name AS artistName, a.photo AS artistPhoto FROM credits c JOIN artists a ON a.id = c.artistId
     WHERE c.${col} = ? ORDER BY c.createdAt`,
    [val as string],
  );
}

export async function setCredits(target: CreditTarget, list: { artistId: string; role: string; instrument?: string | null }[]) {
  const db = await getDb();
  const [col, val] = target.workId
    ? ['workId', target.workId]
    : target.recordingId
      ? ['recordingId', target.recordingId]
      : ['albumId', target.albumId];
  await db.withTransactionAsync(async () => {
    await db.runAsync(`DELETE FROM credits WHERE ${col} = ?`, [val as string]);
    let i = 0;
    for (const c of list) {
      await db.runAsync(
        `INSERT INTO credits (id, artistId, role, instrument, ${col}, createdAt) VALUES (?, ?, ?, ?, ?, ?)`,
        [uid('cr_'), c.artistId, c.role, c.instrument || null, val as string, now() + i++],
      );
    }
  });
  notifyChange();
}

export async function addCredit(target: CreditTarget, artistId: string, role: string) {
  const existing = await creditsFor(target);
  if (existing.some((c) => c.artistId === artistId && c.role === role)) return;
  await setCredits(target, [...existing.map((c) => ({ artistId: c.artistId, role: c.role, instrument: c.instrument })), { artistId, role }]);
}

/** Credits for a recording, merged with the credits of its work. */
export async function fullCredits(rec: { id: string; workId: string | null; albumId?: string | null }): Promise<Credit[]> {
  const own = await creditsFor({ recordingId: rec.id });
  const work = rec.workId ? await creditsFor({ workId: rec.workId }) : [];
  const seen = new Set<string>();
  return [...own, ...work].filter((c) => {
    const k = `${c.artistId}:${c.role}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ---------- journal ---------- */

export async function listJournal(filter?: { recordingId?: string; workId?: string; artistId?: string }): Promise<JournalEntry[]> {
  const db = await getDb();
  let where = '';
  const args: string[] = [];
  if (filter?.recordingId) { where = 'WHERE j.recordingId = ?'; args.push(filter.recordingId); }
  else if (filter?.workId) { where = 'WHERE j.workId = ?'; args.push(filter.workId); }
  else if (filter?.artistId) { where = 'WHERE j.artistId = ?'; args.push(filter.artistId); }
  return db.getAllAsync<JournalEntry>(`
    SELECT j.*, r.title AS recordingTitle, w.title AS workTitle, a.name AS artistName
    FROM journal j
    LEFT JOIN recordings r ON r.id = j.recordingId
    LEFT JOIN works w ON w.id = j.workId
    LEFT JOIN artists a ON a.id = j.artistId
    ${where} ORDER BY j.createdAt DESC`, args);
}

export async function addJournal(e: { text: string; mood?: string | null; recordingId?: string | null; workId?: string | null; artistId?: string | null }) {
  const db = await getDb();
  await db.runAsync('INSERT INTO journal (id, text, mood, recordingId, workId, artistId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', [
    uid('jr_'), e.text.trim(), e.mood || null, e.recordingId || null, e.workId || null, e.artistId || null, now(),
  ]);
  notifyChange();
}

export async function removeJournal(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM journal WHERE id = ?', [id]);
  notifyChange();
}

/* ---------- history ---------- */

export async function logPlayStart(recordingId: string): Promise<string> {
  const db = await getDb();
  const id = uid('hs_');
  await db.runAsync('INSERT INTO history (id, recordingId, playedAt, listened) VALUES (?, ?, ?, 0)', [id, recordingId, now()]);
  await db.runAsync('UPDATE recordings SET playCount = playCount + 1 WHERE id = ?', [recordingId]);
  return id;
}

export async function logPlayProgress(historyId: string, listened: number, completion: number | null) {
  const db = await getDb();
  await db.runAsync('UPDATE history SET listened = ?, completion = ? WHERE id = ?', [listened, completion, historyId]);
}

export async function recentlyPlayed(limit = 20): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT}
    JOIN (SELECT recordingId, MAX(playedAt) AS last FROM history GROUP BY recordingId) h ON h.recordingId = r.id
    ORDER BY h.last DESC LIMIT ?`, [limit]);
}

export async function listeningStats(): Promise<{ weekSeconds: number; totalSeconds: number; topArtist: string | null }> {
  const db = await getDb();
  const week = await db.getFirstAsync<{ s: number }>('SELECT COALESCE(SUM(listened), 0) AS s FROM history WHERE playedAt > ?', [now() - 7 * 86400000]);
  const total = await db.getFirstAsync<{ s: number }>('SELECT COALESCE(SUM(listened), 0) AS s FROM history');
  const top = await db.getFirstAsync<{ name: string }>(`
    SELECT a.name, SUM(h.listened) AS s FROM history h
    JOIN recordings r ON r.id = h.recordingId
    JOIN credits c ON (c.recordingId = r.id OR (c.workId = r.workId AND c.workId IS NOT NULL))
    JOIN artists a ON a.id = c.artistId
    WHERE h.playedAt > ? GROUP BY a.id ORDER BY s DESC LIMIT 1`, [now() - 30 * 86400000]);
  return { weekSeconds: week?.s ?? 0, totalSeconds: total?.s ?? 0, topArtist: top?.name ?? null };
}

/* ---------- collections ---------- */

export async function listCollections(): Promise<Collection[]> {
  const db = await getDb();
  return db.getAllAsync<Collection>(`
    SELECT c.*, (SELECT COUNT(*) FROM collection_items i WHERE i.collectionId = c.id) AS count
    FROM collections c ORDER BY c.updatedAt DESC`);
}

export async function getCollection(id: string): Promise<Collection | null> {
  const db = await getDb();
  return db.getFirstAsync<Collection>('SELECT * FROM collections WHERE id = ?', [id]);
}

export async function saveCollection(c: Partial<Collection> & { title: string }): Promise<string> {
  const id = c.id || uid('cl_');
  const t = now();
  await upsert('collections', {
    id, title: c.title.trim(), description: c.description || null, cover: c.cover || null,
    createdAt: c.createdAt || t, updatedAt: t,
  });
  notifyChange();
  return id;
}

export async function deleteCollection(id: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM collections WHERE id = ?', [id]);
  notifyChange();
}

export async function collectionRecordings(id: string): Promise<RecordingRow[]> {
  const db = await getDb();
  return db.getAllAsync<RecordingRow>(`${REC_SELECT}
    JOIN collection_items i ON i.recordingId = r.id WHERE i.collectionId = ? ORDER BY i.position`, [id]);
}

export async function addToCollection(collectionId: string, recordingId: string) {
  const db = await getDb();
  const m = await db.getFirstAsync<{ p: number }>('SELECT COALESCE(MAX(position), 0) AS p FROM collection_items WHERE collectionId = ?', [collectionId]);
  await db.runAsync('INSERT OR IGNORE INTO collection_items (collectionId, recordingId, position) VALUES (?, ?, ?)', [collectionId, recordingId, (m?.p ?? 0) + 1]);
  await db.runAsync('UPDATE collections SET updatedAt = ? WHERE id = ?', [now(), collectionId]);
  notifyChange();
}

export async function removeFromCollection(collectionId: string, recordingId: string) {
  const db = await getDb();
  await db.runAsync('DELETE FROM collection_items WHERE collectionId = ? AND recordingId = ?', [collectionId, recordingId]);
  notifyChange();
}

/* ---------- settings ---------- */

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const r = await db.getFirstAsync<{ value: string | null }>('SELECT value FROM settings WHERE key = ?', [key]);
  return r?.value ?? null;
}

export async function setSetting(key: string, value: string | null) {
  const db = await getDb();
  await db.runAsync('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value]);
}

/* ---------- galaxy ---------- */

export interface GalaxyData {
  artists: { id: string; name: string; tradition: string; born: string | null; died: string | null; photo: string | null; weight: number; kind: string }[];
  relations: Relation[];
  works: { artistId: string; workId: string; title: string }[];
}

export async function galaxyData(): Promise<GalaxyData> {
  const db = await getDb();
  const artists = await db.getAllAsync<any>(`
    SELECT a.id, a.name, a.tradition, a.born, a.died, a.photo, a.kind,
      (SELECT COUNT(*) FROM credits c WHERE c.artistId = a.id) AS weight
    FROM artists a`);
  const relations = await allRelations();
  const works = await db.getAllAsync<any>(`
    SELECT DISTINCT c.artistId, w.id AS workId, w.title FROM credits c JOIN works w ON w.id = c.workId`);
  return { artists, relations, works };
}

/** Artists that share a work (co-credits) count as implicit links in the galaxy. */
export async function sharedWorkLinks(): Promise<{ a: string; b: string }[]> {
  const db = await getDb();
  return db.getAllAsync(`
    SELECT DISTINCT c1.artistId AS a, c2.artistId AS b FROM credits c1
    JOIN credits c2 ON c1.workId = c2.workId AND c1.workId IS NOT NULL AND c1.artistId < c2.artistId`);
}

/* ---------- export helpers ---------- */

export async function dumpAll(): Promise<Record<string, any[]>> {
  const db = await getDb();
  const tables = ['artists', 'works', 'albums', 'recordings', 'credits', 'relations', 'timeline', 'journal', 'collections', 'collection_items', 'history', 'postcards', 'conversations'];
  const out: Record<string, any[]> = {};
  for (const t of tables) out[t] = await db.getAllAsync(`SELECT * FROM ${t}`);
  return out;
}

export async function insertIgnore(table: string, rows: any[]) {
  if (!rows?.length) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const row of rows) {
      const keys = Object.keys(row);
      await db.runAsync(
        `INSERT OR IGNORE INTO ${table} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`,
        keys.map((k) => row[k]),
      );
    }
  });
}

export function galleryOf(a: { gallery?: string | null }): string[] {
  return parseList(a.gallery);
}

/* ---------- editor helpers ---------- */

export async function loadDraftCredits(target: CreditTarget) {
  const list = await creditsFor(target);
  return list.map((c) => ({ artistId: c.artistId, name: c.artistName ?? '', role: c.role, instrument: c.instrument, photo: c.artistPhoto ?? null }));
}

export async function commitCredits(target: CreditTarget, drafts: { artistId?: string; name: string; role: string; instrument?: string | null }[], tradition = 'persian') {
  const list: { artistId: string; role: string; instrument?: string | null }[] = [];
  for (const d of drafts) {
    const id = d.artistId ?? (await findOrCreateArtist(d.name, tradition));
    list.push({ artistId: id, role: d.role, instrument: d.instrument?.trim() || null });
  }
  await setCredits(target, list);
}

export async function collectionsOf(recordingId: string): Promise<string[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ collectionId: string }>('SELECT collectionId FROM collection_items WHERE recordingId = ?', [recordingId]);
  return rows.map((r) => r.collectionId);
}
