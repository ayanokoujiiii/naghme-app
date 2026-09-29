import { File } from 'expo-file-system';
import { AudioMeta, parseAiffMeta, parseDsfMeta, parseFlac, parseId3, parseWav } from './tags';
import { extOf } from './formats';

function readRange(uri: string, offset: number, length: number): Uint8Array {
  const f = new File(uri);
  const h = f.open();
  try {
    h.offset = offset;
    const size = f.size ?? length;
    return h.readBytes(Math.max(0, Math.min(length, size - offset)));
  } finally {
    h.close();
  }
}

/** Reads tags + technical info from the start of an audio file. Never throws. */
export function readAudioMeta(uri: string, name: string): AudioMeta {
  const ext = extOf(name);
  try {
    let head = readRange(uri, 0, 1024 * 1024);
    if (ext === 'flac') {
      let r = parseFlac(head);
      if (r.needBytes && r.needBytes < 16 * 1024 * 1024) {
        head = readRange(uri, 0, r.needBytes + 1024);
        r = parseFlac(head);
      }
      return r.meta;
    }
    if (ext === 'mp3') {
      const meta = parseId3(head);
      if (head[0] === 0x49 && head[1] === 0x44 && head[2] === 0x33) {
        const size = (head[6] << 21) | (head[7] << 14) | (head[8] << 7) | head[9];
        if (size + 10 > head.length && size < 16 * 1024 * 1024) return parseId3(readRange(uri, 0, size + 10));
      }
      return meta;
    }
    if (ext === 'wav') return parseWav(head);
    if (ext === 'aif' || ext === 'aiff') return parseAiffMeta(head);
    if (ext === 'dsf') {
      const { meta, id3Offset } = parseDsfMeta(head);
      if (id3Offset > 0) {
        const tagBytes = readRange(uri, id3Offset, 8 * 1024 * 1024);
        parseId3(tagBytes, 0, meta);
      }
      return meta;
    }
    if (ext === 'dff') return parseDsfMeta(head).meta;
    return {};
  } catch {
    return {};
  }
}
