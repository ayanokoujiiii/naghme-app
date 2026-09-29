import { File } from 'expo-file-system';
import { convertAiffToWav, convertDsdToWav } from './convert';
import { formatOf, extOf } from './formats';
import { readAudioMeta } from './metadata';
import { titleFromFilename } from './tags';
import { musicDir, saveImageBytes } from '../services/files';
import { uid } from '../utils';
import {
  addCredit, findOrCreateAlbum, findOrCreateArtist, findOrCreateWork, getSetting, saveRecording,
} from '../db/repo';

export interface PickedFile { uri: string; name: string; size?: number | null }
export interface ImportResult { name: string; recordingId?: string; error?: string; converted?: boolean }
export type ImportProgress = (info: { index: number; total: number; name: string; stage: string; fraction: number }) => void;

function guessTradition(meta: { genre?: string; artist?: string; composer?: string }): string {
  const s = `${meta.genre ?? ''} ${meta.artist ?? ''} ${meta.composer ?? ''}`;
  if (/[\u0600-\u06FF]/.test(s) || /persian|iran|golha/i.test(s)) return 'persian';
  if (/classical|baroque|romantic|symphon|beethoven|mozart|chopin|bach|haydn|schubert|brahms|liszt|debussy|tchaikovsky/i.test(s)) return 'classical';
  return 'persian';
}

export async function importAudioFiles(files: PickedFile[], onProgress?: ImportProgress): Promise<ImportResult[]> {
  const results: ImportResult[] = [];
  const quality = (await getSetting('dsdRate')) || '88200';
  const targetRate = Number(quality) || 88200;

  for (let i = 0; i < files.length; i++) {
    const f = files[i];
    const report = (stage: string, fraction: number) => onProgress?.({ index: i, total: files.length, name: f.name, stage, fraction });
    try {
      const fmt = formatOf(f.name);
      if (!fmt) {
        results.push({ name: f.name, error: 'این فرمت شناخته نشد.' });
        continue;
      }
      report('خواندن اطلاعات', 0);
      const meta = readAudioMeta(f.uri, f.name);
      const id = uid('rc_');
      let audioUri: string;
      let tech = { sampleRate: meta.sampleRate ?? null, bitDepth: meta.bitDepth ?? null, channels: meta.channels ?? null, duration: meta.duration ?? null };
      let converted = false;

      if (fmt.convert) {
        const dest = new File(musicDir(), `${id}.wav`);
        const r = fmt.convert === 'dsd'
          ? await convertDsdToWav(f.uri, dest, targetRate, (p) => report('تبدیل DSD', p))
          : await convertAiffToWav(f.uri, dest, (p) => report('تبدیل AIFF', p));
        audioUri = dest.uri;
        converted = true;
        tech = { sampleRate: fmt.convert === 'dsd' ? meta.sampleRate ?? r.sampleRate : r.sampleRate, bitDepth: fmt.convert === 'dsd' ? 1 : r.bitDepth, channels: r.channels, duration: r.duration };
      } else {
        report('کپی در آرشیو', 0.5);
        const dest = new File(musicDir(), `${id}.${extOf(f.name)}`);
        new File(f.uri).copy(dest);
        audioUri = dest.uri;
      }
      try { if (f.uri.includes('/cache/')) new File(f.uri).delete(); } catch { /* ignore */ }

      report('ثبت در آرشیو', 1);
      const tradition = guessTradition(meta);
      const title = meta.title || titleFromFilename(f.name);
      let cover: string | null = null;
      if (meta.picture?.data?.length) {
        try { cover = saveImageBytes(meta.picture.data, meta.picture.mime); } catch { cover = null; }
      }
      const workId = await findOrCreateWork(title, tradition);
      const albumId = meta.album ? await findOrCreateAlbum(meta.album) : null;

      await saveRecording({
        id, title, workId, albumId,
        discNo: meta.disc ?? null, trackNo: meta.track ?? null,
        audioUri, originalName: f.name, format: extOf(f.name),
        sampleRate: tech.sampleRate, bitDepth: tech.bitDepth, channels: tech.channels, duration: tech.duration,
        year: meta.year ?? null, cover, lyrics: meta.lyrics ?? null,
      });

      const performer = meta.artist || meta.albumArtist;
      if (performer) {
        for (const name of performer.split(/\s*[;,،\/&]\s*/).filter(Boolean).slice(0, 4)) {
          const aid = await findOrCreateArtist(name, tradition);
          await addCredit({ recordingId: id }, aid, tradition === 'persian' ? 'vocalist' : 'performer');
        }
      }
      if (meta.composer) {
        const aid = await findOrCreateArtist(meta.composer, tradition);
        await addCredit({ workId }, aid, 'composer');
      }
      if (meta.lyricist) {
        const aid = await findOrCreateArtist(meta.lyricist, tradition);
        await addCredit({ workId }, aid, 'lyricist');
      }
      if (meta.conductor) {
        const aid = await findOrCreateArtist(meta.conductor, tradition);
        await addCredit({ recordingId: id }, aid, 'conductor');
      }
      results.push({ name: f.name, recordingId: id, converted });
    } catch (e: any) {
      results.push({ name: f.name, error: e?.message || 'وارد کردن این فایل انجام نشد.' });
    }
  }
  return results;
}

/** Attach / replace the audio of an existing recording (e.g. after importing a friend's archive pack). */
export async function attachAudio(recordingId: string, title: string, file: PickedFile, onProgress?: (p: number) => void): Promise<void> {
  const fmt = formatOf(file.name);
  if (!fmt) throw new Error('این فرمت شناخته نشد.');
  const meta = readAudioMeta(file.uri, file.name);
  const targetRate = Number((await getSetting('dsdRate')) || '88200');
  let audioUri: string;
  let tech: any = { sampleRate: meta.sampleRate ?? null, bitDepth: meta.bitDepth ?? null, channels: meta.channels ?? null, duration: meta.duration ?? null };
  const stamp = uid('a');
  if (fmt.convert) {
    const dest = new File(musicDir(), `${recordingId}_${stamp}.wav`);
    const r = fmt.convert === 'dsd' ? await convertDsdToWav(file.uri, dest, targetRate, onProgress) : await convertAiffToWav(file.uri, dest, onProgress);
    audioUri = dest.uri;
    tech = { sampleRate: fmt.convert === 'dsd' ? meta.sampleRate : r.sampleRate, bitDepth: fmt.convert === 'dsd' ? 1 : r.bitDepth, channels: r.channels, duration: r.duration };
  } else {
    const dest = new File(musicDir(), `${recordingId}_${stamp}.${extOf(file.name)}`);
    new File(file.uri).copy(dest);
    audioUri = dest.uri;
  }
  await saveRecording({ id: recordingId, title, audioUri, originalName: file.name, format: extOf(file.name), ...tech });
}
