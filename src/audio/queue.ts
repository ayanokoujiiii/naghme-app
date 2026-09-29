import { RecordingRow, recArtistLine, recCover } from '../db/repo';
import { playQueue, QueueItem } from './player';

export function toQueueItem(r: RecordingRow): QueueItem | null {
  if (!r.audioUri) return null;
  return {
    id: r.id,
    uri: r.audioUri,
    title: r.title,
    artist: recArtistLine(r),
    cover: recCover(r),
    lyrics: r.lyrics || r.workLyrics || null,
    workId: r.workId,
    duration: r.duration,
  };
}

export function playRows(rows: RecordingRow[], startId?: string) {
  const items = rows.map(toQueueItem).filter((x): x is QueueItem => !!x);
  if (!items.length) return false;
  const idx = startId ? Math.max(0, items.findIndex((i) => i.id === startId)) : 0;
  void playQueue(items, idx);
  return true;
}
