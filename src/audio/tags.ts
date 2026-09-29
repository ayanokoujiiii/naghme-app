/** Pure tag parsers (FLAC, ID3v2, WAV, DSF header). No React Native imports. */
import { parseDsdHeader, parseAiffHeader } from './dsp';

export interface AudioMeta {
  title?: string;
  artist?: string;
  album?: string;
  albumArtist?: string;
  composer?: string;
  lyricist?: string;
  conductor?: string;
  year?: string;
  track?: number;
  disc?: number;
  lyrics?: string;
  genre?: string;
  sampleRate?: number;
  bitDepth?: number;
  channels?: number;
  duration?: number;
  picture?: { mime: string; data: Uint8Array };
}

export function utf8(b: Uint8Array, s = 0, e = b.length): string {
  let out = '';
  let i = s;
  while (i < e) {
    const c = b[i++];
    if (c < 0x80) out += String.fromCharCode(c);
    else if (c < 0xe0) out += String.fromCharCode(((c & 0x1f) << 6) | (b[i++] & 0x3f));
    else if (c < 0xf0) out += String.fromCharCode(((c & 0x0f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f));
    else {
      const cp = ((c & 0x07) << 18) | ((b[i++] & 0x3f) << 12) | ((b[i++] & 0x3f) << 6) | (b[i++] & 0x3f);
      const v = cp - 0x10000;
      out += String.fromCharCode(0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff));
    }
  }
  return out;
}

function utf16(b: Uint8Array, s: number, e: number, bigEndian: boolean): string {
  let out = '';
  for (let i = s; i + 1 < e; i += 2) {
    const code = bigEndian ? (b[i] << 8) | b[i + 1] : b[i] | (b[i + 1] << 8);
    if (code === 0) break;
    out += String.fromCharCode(code);
  }
  return out;
}

function latin1(b: Uint8Array, s: number, e: number): string {
  let out = '';
  for (let i = s; i < e; i++) {
    if (b[i] === 0) break;
    out += String.fromCharCode(b[i]);
  }
  return out;
}

const NUL = new RegExp(String.fromCharCode(0), 'g');
const clean = (s?: string) => (s ? s.replace(NUL, '').trim() || undefined : undefined);
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const syncsafe = (b: Uint8Array, o: number) => (b[o] << 21) | (b[o + 1] << 14) | (b[o + 2] << 7) | b[o + 3];
const tag4 = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

function decodeText(b: Uint8Array, s: number, e: number, enc: number): string {
  if (enc === 0) return latin1(b, s, e);
  if (enc === 3) return utf8(b, s, e);
  if (enc === 2) return utf16(b, s, e, true);
  // enc 1: UTF-16 with BOM
  if (b[s] === 0xfe && b[s + 1] === 0xff) return utf16(b, s + 2, e, true);
  if (b[s] === 0xff && b[s + 1] === 0xfe) return utf16(b, s + 2, e, false);
  return utf16(b, s, e, false);
}

function applyNumberPair(v: string | undefined): number | undefined {
  if (!v) return undefined;
  const n = parseInt(v.split('/')[0], 10);
  return Number.isFinite(n) ? n : undefined;
}

/** ID3v2.2 / 2.3 / 2.4 */
export function parseId3(b: Uint8Array, start = 0, meta: AudioMeta = {}): AudioMeta {
  if (b[start] !== 0x49 || b[start + 1] !== 0x44 || b[start + 2] !== 0x33) return meta;
  const ver = b[start + 3];
  const size = syncsafe(b, start + 6);
  let o = start + 10;
  const end = Math.min(b.length, start + 10 + size);
  if (b[start + 5] & 0x40 && ver >= 3) {
    const ext = ver === 4 ? syncsafe(b, o) : u32be(b, o) + 4;
    o += ext;
  }
  const idLen = ver === 2 ? 3 : 4;
  const hdrLen = ver === 2 ? 6 : 10;
  while (o + hdrLen < end) {
    const id = ver === 2 ? String.fromCharCode(b[o], b[o + 1], b[o + 2]) : tag4(b, o);
    if (!/^[A-Z0-9]{3,4}$/.test(id)) break;
    const fsize = ver === 2 ? (b[o + 3] << 16) | (b[o + 4] << 8) | b[o + 5] : ver === 4 ? syncsafe(b, o + 4) : u32be(b, o + 4);
    const ds = o + hdrLen;
    const de = Math.min(end, ds + fsize);
    if (fsize <= 0) break;
    const key = id.slice(0, idLen);
    const text = () => clean(decodeText(b, ds + 1, de, b[ds]));
    switch (key) {
      case 'TIT2': case 'TT2': meta.title = text(); break;
      case 'TPE1': case 'TP1': meta.artist = text(); break;
      case 'TPE2': case 'TP2': meta.albumArtist = text(); break;
      case 'TALB': case 'TAL': meta.album = text(); break;
      case 'TCOM': case 'TCM': meta.composer = text(); break;
      case 'TEXT': case 'TXT': meta.lyricist = text(); break;
      case 'TPE3': case 'TP3': meta.conductor = text(); break;
      case 'TCON': case 'TCO': meta.genre = text(); break;
      case 'TYER': case 'TYE': case 'TDRC': meta.year = text()?.slice(0, 4); break;
      case 'TRCK': case 'TRK': meta.track = applyNumberPair(text()); break;
      case 'TPOS': case 'TPA': meta.disc = applyNumberPair(text()); break;
      case 'USLT': case 'ULT': {
        const enc = b[ds];
        let p = ds + 4; // enc + lang(3)
        if (enc === 1 || enc === 2) { while (p + 1 < de && !(b[p] === 0 && b[p + 1] === 0)) p += 2; p += 2; }
        else { while (p < de && b[p] !== 0) p++; p++; }
        meta.lyrics = clean(decodeText(b, p, de, enc));
        break;
      }
      case 'APIC': case 'PIC': {
        if (meta.picture) break;
        const enc = b[ds];
        let p = ds + 1;
        let mime = 'image/jpeg';
        if (key === 'PIC') { const f = latin1(b, p, p + 3).toLowerCase(); mime = f === 'png' ? 'image/png' : 'image/jpeg'; p += 3; }
        else { const ms = p; while (p < de && b[p] !== 0) p++; mime = latin1(b, ms, p) || mime; p++; }
        p++; // picture type
        if (enc === 1 || enc === 2) { while (p + 1 < de && !(b[p] === 0 && b[p + 1] === 0)) p += 2; p += 2; }
        else { while (p < de && b[p] !== 0) p++; p++; }
        if (de > p) meta.picture = { mime: mime.includes('/') ? mime : `image/${mime}`, data: b.slice(p, de) };
        break;
      }
    }
    o = de;
  }
  return meta;
}

export function parseFlac(b: Uint8Array, meta: AudioMeta = {}): { meta: AudioMeta; needBytes?: number } {
  if (tag4(b, 0) !== 'fLaC') return { meta };
  let o = 4;
  let last = false;
  while (!last && o + 4 <= b.length) {
    last = (b[o] & 0x80) !== 0;
    const type = b[o] & 0x7f;
    const len = (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3];
    const s = o + 4;
    if (s + len > b.length) return { meta, needBytes: s + len };
    if (type === 0) {
      const sr = (b[s + 10] << 12) | (b[s + 11] << 4) | (b[s + 12] >> 4);
      const ch = ((b[s + 12] >> 1) & 0x07) + 1;
      const bps = (((b[s + 12] & 1) << 4) | (b[s + 13] >> 4)) + 1;
      const total = (b[s + 13] & 0x0f) * 4294967296 + u32be(b, s + 14);
      meta.sampleRate = sr; meta.channels = ch; meta.bitDepth = bps;
      if (sr && total) meta.duration = total / sr;
    } else if (type === 4) {
      let p = s;
      const vlen = u32le(b, p); p += 4 + vlen;
      const count = u32le(b, p); p += 4;
      for (let i = 0; i < count && p < s + len; i++) {
        const l = u32le(b, p); p += 4;
        const kv = utf8(b, p, p + l); p += l;
        const eq = kv.indexOf('=');
        if (eq < 0) continue;
        const k = kv.slice(0, eq).toUpperCase();
        const v = clean(kv.slice(eq + 1));
        if (!v) continue;
        if (k === 'TITLE') meta.title = v;
        else if (k === 'ARTIST' && !meta.artist) meta.artist = v;
        else if (k === 'ALBUMARTIST' || k === 'ALBUM ARTIST') meta.albumArtist = v;
        else if (k === 'ALBUM') meta.album = v;
        else if (k === 'COMPOSER') meta.composer = v;
        else if (k === 'LYRICIST') meta.lyricist = v;
        else if (k === 'CONDUCTOR') meta.conductor = v;
        else if (k === 'GENRE') meta.genre = v;
        else if (k === 'DATE' || k === 'YEAR') meta.year = v.slice(0, 4);
        else if (k === 'TRACKNUMBER') meta.track = applyNumberPair(v);
        else if (k === 'DISCNUMBER') meta.disc = applyNumberPair(v);
        else if (k === 'LYRICS' || k === 'UNSYNCEDLYRICS') meta.lyrics = v;
      }
    } else if (type === 6 && !meta.picture) {
      let p = s + 4;
      const ml = u32be(b, p); p += 4;
      const mime = latin1(b, p, p + ml); p += ml;
      const dl = u32be(b, p); p += 4 + dl + 16;
      const len2 = u32be(b, p); p += 4;
      meta.picture = { mime: mime || 'image/jpeg', data: b.slice(p, p + len2) };
    }
    o = s + len;
  }
  return { meta };
}

export function parseWav(b: Uint8Array, meta: AudioMeta = {}): AudioMeta {
  if (tag4(b, 0) !== 'RIFF' || tag4(b, 8) !== 'WAVE') return meta;
  let o = 12;
  let byteRate = 0;
  while (o + 8 <= b.length) {
    const id = tag4(b, o);
    const size = u32le(b, o + 4);
    const s = o + 8;
    if (id === 'fmt ') {
      meta.channels = b[s + 2] | (b[s + 3] << 8);
      meta.sampleRate = u32le(b, s + 4);
      byteRate = u32le(b, s + 8);
      meta.bitDepth = b[s + 14] | (b[s + 15] << 8);
    } else if (id === 'data') {
      if (byteRate) meta.duration = size / byteRate;
      break;
    } else if (id === 'LIST' && tag4(b, s) === 'INFO') {
      let p = s + 4;
      while (p + 8 <= s + size && p + 8 <= b.length) {
        const k = tag4(b, p);
        const l = u32le(b, p + 4);
        const v = clean(utf8(b, p + 8, Math.min(b.length, p + 8 + l)));
        if (k === 'INAM') meta.title = v;
        if (k === 'IART') meta.artist = v;
        if (k === 'IPRD') meta.album = v;
        if (k === 'ICRD') meta.year = v?.slice(0, 4);
        p += 8 + l + (l % 2);
      }
    } else if ((id === 'id3 ' || id === 'ID3 ') && s < b.length) {
      parseId3(b, s, meta);
    }
    o = s + size + (size % 2);
  }
  return meta;
}

export function parseDsfMeta(head: Uint8Array, meta: AudioMeta = {}): { meta: AudioMeta; id3Offset: number } {
  const info = parseDsdHeader(head);
  if (!info) return { meta, id3Offset: 0 };
  meta.sampleRate = info.sampleRate;
  meta.channels = info.channels;
  meta.bitDepth = 1;
  meta.duration = info.sampleCount / info.sampleRate;
  return { meta, id3Offset: info.metadataOffset };
}

export function parseAiffMeta(head: Uint8Array, meta: AudioMeta = {}): AudioMeta {
  const info = parseAiffHeader(head);
  if (!info) return meta;
  meta.sampleRate = info.sampleRate;
  meta.channels = info.channels;
  meta.bitDepth = info.bits;
  meta.duration = info.frames / info.sampleRate;
  return meta;
}

/** Clean up file names like "03 - Delkash - Bahar.flac" into a title. */
export function titleFromFilename(name: string): string {
  return name
    .replace(/\.[a-z0-9]{2,5}$/i, '')
    .replace(/^\s*\d{1,3}\s*[-._)]\s*/, '')
    .replace(/_/g, ' ')
    .trim();
}
