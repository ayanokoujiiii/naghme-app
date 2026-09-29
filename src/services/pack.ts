import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { dumpAll, insertIgnore } from '../db/repo';
import { ALL_TABLES, wipeArchive } from '../db/extra';
import { notifyChange } from '../db';
import { imagesDir } from './files';
import { parseList } from '../utils';

const IMAGE_FIELDS: Record<string, string[]> = {
  artists: ['photo', 'cover'],
  works: ['poster'],
  albums: ['cover'],
  recordings: ['cover'],
  collections: ['cover'],
  postcards: ['preview'],
};
const LIST_FIELDS: Record<string, string[]> = { artists: ['gallery'], works: ['sheetImages'] };

/**
 * Archive pack = everything except the audio itself (so it can be shared freely).
 * Friends import it and attach their own audio files later.
 */
export async function exportPack(kind: 'share' | 'backup' = 'share'): Promise<void> {
  const data = await dumpAll();
  if (kind === 'share') {
    // a pack for friends carries knowledge, not your private listening life
    delete data.history;
    delete data.conversations;
    delete data.journal;
  }
  const files: Record<string, Uint8Array> = {};
  const map = new Map<string, string>();
  const addImage = (uri: string | null) => {
    if (!uri || !uri.startsWith('file:')) return uri;
    if (map.has(uri)) return map.get(uri)!;
    try {
      const f = new File(uri);
      if (!f.exists) return null;
      const name = `images/${map.size}_${f.name}`;
      files[name] = f.bytesSync();
      map.set(uri, `pack:${name}`);
      return `pack:${name}`;
    } catch {
      return null;
    }
  };
  for (const [table, rows] of Object.entries(data)) {
    for (const row of rows) {
      for (const f of IMAGE_FIELDS[table] ?? []) row[f] = addImage(row[f]);
      for (const f of LIST_FIELDS[table] ?? []) row[f] = JSON.stringify(parseList(row[f]).map(addImage).filter(Boolean));
      if (table === 'recordings' && kind === 'share') {
        row.audioUri = null;
        row.playCount = 0;
      }
    }
  }
  files['naghme.json'] = strToU8(JSON.stringify({ app: 'naghme', version: 2, kind, exportedAt: Date.now(), data }));
  const zipped = zipSync(files, { level: 6 });
  const stamp = new Date().toISOString().slice(0, 10);
  const out = new File(Paths.cache, kind === 'share' ? `naghme-archive-${stamp}.naghme.zip` : `naghme-backup-${stamp}.naghme.zip`);
  if (out.exists) out.delete();
  out.create();
  out.write(zipped);
  await Sharing.shareAsync(out.uri, { mimeType: 'application/zip', dialogTitle: kind === 'share' ? 'اشتراک بستهٔ آرشیو نغمه' : 'پشتیبان آرشیو نغمه' });
}

/**
 * merge: nothing already in the archive is touched, new items are added.
 * replace: the archive is emptied first, then filled from the file.
 * Audio files are never inside a pack; recordings keep their old link only if
 * the file still exists on this phone.
 */
export async function importPack(uri: string, mode: 'merge' | 'replace' = 'merge'): Promise<{ artists: number; works: number; recordings: number; missingAudio: number }> {
  const bytes = await new File(uri).bytes();
  const entries = unzipSync(bytes);
  const json = entries['naghme.json'];
  if (!json) throw new Error('این فایل، بستهٔ آرشیو نغمه نیست.');
  const pack = JSON.parse(strFromU8(json));
  const data: Record<string, any[]> = pack.data ?? {};
  const dir = imagesDir();
  const restored = new Map<string, string>();
  const restore = (v: string | null) => {
    if (!v || !v.startsWith('pack:')) return v;
    if (restored.has(v)) return restored.get(v)!;
    const name = v.slice(5);
    const content = entries[name];
    if (!content) return null;
    const f = new File(dir, `pk_${Date.now().toString(36)}_${name.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    f.create();
    f.write(content);
    restored.set(v, f.uri);
    return f.uri;
  };
  for (const [table, rows] of Object.entries(data)) {
    for (const row of rows) {
      for (const f of IMAGE_FIELDS[table] ?? []) row[f] = restore(row[f]);
      for (const f of LIST_FIELDS[table] ?? []) row[f] = JSON.stringify(parseList(row[f]).map(restore).filter(Boolean));
    }
  }
  let missingAudio = 0;
  for (const row of data.recordings ?? []) {
    if (!row.audioUri) continue;
    try {
      if (!new File(row.audioUri).exists) { row.audioUri = null; missingAudio++; }
    } catch {
      row.audioUri = null;
      missingAudio++;
    }
  }
  if (mode === 'replace') await wipeArchive();
  for (const t of ALL_TABLES) await insertIgnore(t, data[t] ?? []);
  notifyChange();
  return { artists: data.artists?.length ?? 0, works: data.works?.length ?? 0, recordings: data.recordings?.length ?? 0, missingAudio };
}
