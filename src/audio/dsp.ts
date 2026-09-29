/**
 * Pure DSP helpers (no React Native imports) so they can be unit-tested in Node.
 * DSD -> PCM uses a classic multi-stage decimator:
 *   stage 1: 48-tap FIR evaluated with 8-bit lookup tables, DSD rate / 8
 *   stage 2..n: half-band FIR filters, each / 2
 */

function kaiserBessel0(x: number): number {
  let sum = 1, term = 1;
  for (let k = 1; k < 40; k++) {
    term *= (x / (2 * k)) * (x / (2 * k));
    sum += term;
    if (term < 1e-12 * sum) break;
  }
  return sum;
}

/** Windowed-sinc low-pass. fc = cutoff as fraction of the sample rate (0..0.5). */
export function designLowpass(taps: number, fc: number, beta: number): Float64Array {
  const h = new Float64Array(taps);
  const m = (taps - 1) / 2;
  const denom = kaiserBessel0(beta);
  let sum = 0;
  for (let n = 0; n < taps; n++) {
    const x = n - m;
    const sinc = x === 0 ? 2 * fc : Math.sin(2 * Math.PI * fc * x) / (Math.PI * x);
    const r = m === 0 ? 0 : x / m;
    const w = kaiserBessel0(beta * Math.sqrt(Math.max(0, 1 - r * r))) / denom;
    h[n] = sinc * w;
    sum += h[n];
  }
  for (let n = 0; n < taps; n++) h[n] /= sum;
  return h;
}

export const BIT_REVERSE = (() => {
  const t = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let r = 0;
    for (let b = 0; b < 8; b++) if (i & (1 << b)) r |= 1 << (7 - b);
    t[i] = r;
  }
  return t;
})();

const STAGE1_TAPS = 48;
const STAGE1_TABLES = STAGE1_TAPS / 8;

/** Precomputed tables: tables[p][byte] = contribution of one MSB-first byte at FIFO position p. */
function buildStage1Tables(): Float32Array[] {
  const h = designLowpass(STAGE1_TAPS, 0.035, 7);
  const tables: Float32Array[] = [];
  for (let p = 0; p < STAGE1_TABLES; p++) {
    const t = new Float32Array(256);
    for (let b = 0; b < 256; b++) {
      let acc = 0;
      for (let k = 0; k < 8; k++) {
        const bit = (b >> (7 - k)) & 1; // k = time order inside the byte (MSB first)
        const age = p * 8 + (7 - k);
        acc += h[age] * (bit ? 1 : -1);
      }
      t[b] = acc;
    }
    tables.push(t);
  }
  return tables;
}

let stage1Cache: Float32Array[] | null = null;

class HalfBand {
  private coef: Float64Array;
  private offs: Int32Array;
  private buf: Float64Array;
  private n: number;
  private pos = 0;
  private phase = 0;
  constructor(taps: number) {
    const h = designLowpass(taps, 0.25, 8);
    const c: number[] = [];
    const o: number[] = [];
    for (let i = 0; i < taps; i++) if (Math.abs(h[i]) > 1e-12) { c.push(h[i]); o.push(i); }
    this.coef = Float64Array.from(c);
    this.offs = Int32Array.from(o);
    this.n = taps;
    this.buf = new Float64Array(taps * 2); // mirrored ring avoids modulo in the hot loop
  }
  /** Push one sample; returns output every second sample, otherwise NaN. */
  push(x: number): number {
    const n = this.n;
    this.buf[this.pos] = x;
    this.buf[this.pos + n] = x;
    this.pos++;
    if (this.pos === n) this.pos = 0;
    this.phase ^= 1;
    if (this.phase) return NaN;
    const base = this.pos;
    const buf = this.buf, coef = this.coef, offs = this.offs;
    let acc = 0;
    for (let i = 0; i < coef.length; i++) acc += coef[i] * buf[base + offs[i]];
    return acc;
  }
}

/** Streaming DSD->PCM converter for one channel. Feed MSB-first bytes. */
export class DsdChannel {
  private fifo = new Uint8Array(STAGE1_TABLES);
  private tables: Float32Array[];
  private stages: HalfBand[];
  constructor(halvings: number) {
    if (!stage1Cache) stage1Cache = buildStage1Tables();
    this.tables = stage1Cache;
    this.fifo.fill(0x69); // silence pattern
    const tapsFor = [15, 31, 63, 111, 111, 111];
    this.stages = Array.from({ length: halvings }, (_, i) => new HalfBand(tapsFor[Math.min(i, tapsFor.length - 1)]));
  }
  /** Process bytes, append produced samples into out starting at offset. Returns new offset. */
  process(bytes: Uint8Array, start: number, end: number, stride: number, out: Float32Array, offset: number): number {
    const fifo = this.fifo;
    const t = this.tables;
    const nT = t.length;
    for (let i = start; i < end; i += stride) {
      for (let p = nT - 1; p > 0; p--) fifo[p] = fifo[p - 1];
      fifo[0] = bytes[i];
      let s = 0;
      for (let p = 0; p < nT; p++) s += t[p][fifo[p]];
      let v = s;
      let produced = true;
      for (let k = 0; k < this.stages.length; k++) {
        v = this.stages[k].push(v);
        if (v !== v) { produced = false; break; } // NaN check
      }
      if (produced) out[offset++] = v;
    }
    return offset;
  }
}

/** How many half-band stages bring (dsdRate / 8) down to targetRate. */
export function halvingsFor(dsdRate: number, targetRate: number): number {
  let r = dsdRate / 8;
  let n = 0;
  while (r > targetRate * 1.01 && n < 6) { r /= 2; n++; }
  return n;
}

export function wavHeader(dataBytes: number, sampleRate: number, channels: number, bits: number): Uint8Array {
  const h = new Uint8Array(44);
  const v = new DataView(h.buffer);
  const w = (o: number, s: string) => { for (let i = 0; i < 4; i++) h[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); v.setUint32(4, 36 + dataBytes, true); w(8, 'WAVE');
  w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, channels, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * channels * (bits / 8), true);
  v.setUint16(32, channels * (bits / 8), true); v.setUint16(34, bits, true);
  w(36, 'data'); v.setUint32(40, dataBytes, true);
  return h;
}

/** Interleave float channels into little-endian 24-bit PCM with gain and clipping. */
export function toPcm24(chs: Float32Array[], frames: number, gain: number): Uint8Array {
  const nc = chs.length;
  const out = new Uint8Array(frames * nc * 3);
  let o = 0;
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < nc; c++) {
      let x = chs[c][f] * gain;
      if (x > 0.999999) x = 0.999999; else if (x < -1) x = -1;
      let s = Math.round(x * 8388607);
      if (s < 0) s += 16777216;
      out[o++] = s & 255; out[o++] = (s >> 8) & 255; out[o++] = (s >> 16) & 255;
    }
  }
  return out;
}

/* ---------- container parsing ---------- */

export interface DsdInfo {
  container: 'dsf' | 'dff';
  sampleRate: number;
  channels: number;
  dataOffset: number;
  dataBytes: number;
  blockSize: number; // DSF per-channel block size, DFF = 1 (byte interleaved)
  lsbFirst: boolean;
  sampleCount: number; // per channel, in bits
  metadataOffset: number; // DSF id3 pointer (0 if none)
  compressed: boolean;
}

const u32le = (b: Uint8Array, o: number) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
const u64le = (b: Uint8Array, o: number) => u32le(b, o) + u32le(b, o + 4) * 4294967296;
const u32be = (b: Uint8Array, o: number) => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const u64be = (b: Uint8Array, o: number) => u32be(b, o) * 4294967296 + u32be(b, o + 4);
const u16be = (b: Uint8Array, o: number) => (b[o] << 8) | b[o + 1];
const tag = (b: Uint8Array, o: number) => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

/** Parse DSF / DFF header from the first bytes of the file (64KB is plenty). */
export function parseDsdHeader(b: Uint8Array): DsdInfo | null {
  if (tag(b, 0) === 'DSD ') {
    const metadataOffset = u64le(b, 20);
    let o = u64le(b, 4); // size of DSD chunk (28)
    if (tag(b, o) !== 'fmt ') return null;
    const fmtSize = u64le(b, o + 4);
    const channels = u32le(b, o + 24);
    const sampleRate = u32le(b, o + 28);
    const bps = u32le(b, o + 32);
    const sampleCount = u64le(b, o + 36);
    const blockSize = u32le(b, o + 44);
    o += fmtSize;
    if (tag(b, o) !== 'data') return null;
    const dataSize = u64le(b, o + 4) - 12;
    return {
      container: 'dsf', sampleRate, channels, dataOffset: o + 12, dataBytes: dataSize,
      blockSize, lsbFirst: bps === 1, sampleCount, metadataOffset, compressed: false,
    };
  }
  if (tag(b, 0) === 'FRM8' && tag(b, 12) === 'DSD ') {
    let o = 16;
    let sampleRate = 0, channels = 0, compressed = false;
    while (o + 12 <= b.length) {
      const id = tag(b, o);
      const size = u64be(b, o + 4);
      const body = o + 12;
      if (id === 'PROP') {
        let p = body + 4; // skip 'SND '
        const end = body + size;
        while (p + 12 <= end && p + 12 <= b.length) {
          const sid = tag(b, p);
          const ssize = u64be(b, p + 4);
          if (sid === 'FS  ') sampleRate = u32be(b, p + 12);
          if (sid === 'CHNL') channels = u16be(b, p + 12);
          if (sid === 'CMPR') compressed = tag(b, p + 12) !== 'DSD ';
          p += 12 + ssize + (ssize % 2);
        }
      } else if (id === 'DSD ' || id === 'DST ') {
        return {
          container: 'dff', sampleRate, channels, dataOffset: body, dataBytes: size, blockSize: 1,
          lsbFirst: false, sampleCount: (size / Math.max(1, channels)) * 8, metadataOffset: 0,
          compressed: compressed || id === 'DST ',
        };
      }
      o = body + size + (size % 2);
    }
  }
  return null;
}

/* ---------- AIFF ---------- */

export interface AiffInfo { channels: number; sampleRate: number; bits: number; frames: number; dataOffset: number; dataBytes: number; littleEndian: boolean }

function ieee80(b: Uint8Array, o: number): number {
  const exp = ((b[o] & 0x7f) << 8) | b[o + 1];
  let mant = 0;
  for (let i = 0; i < 8; i++) mant = mant * 256 + b[o + 2 + i];
  if (exp === 0 && mant === 0) return 0;
  return mant * Math.pow(2, exp - 16383 - 63) * (b[o] & 0x80 ? -1 : 1);
}

export function parseAiffHeader(b: Uint8Array): AiffInfo | null {
  if (tag(b, 0) !== 'FORM') return null;
  const form = tag(b, 8);
  if (form !== 'AIFF' && form !== 'AIFC') return null;
  let o = 12;
  let info: Partial<AiffInfo> = { littleEndian: false };
  while (o + 8 <= b.length) {
    const id = tag(b, o);
    const size = u32be(b, o + 4);
    if (id === 'COMM') {
      info.channels = u16be(b, o + 8);
      info.frames = u32be(b, o + 10);
      info.bits = u16be(b, o + 14);
      info.sampleRate = Math.round(ieee80(b, o + 16));
      if (form === 'AIFC' && size >= 22) {
        const comp = tag(b, o + 26);
        if (comp === 'sowt') info.littleEndian = true;
        else if (comp !== 'NONE' && comp !== 'twos') return null;
      }
    } else if (id === 'SSND') {
      const offset = u32be(b, o + 8);
      info.dataOffset = o + 16 + offset;
      info.dataBytes = size - 8 - offset;
      if (info.channels) return info as AiffInfo;
    }
    o += 8 + size + (size % 2);
  }
  return null;
}

/** Big-endian PCM -> little-endian in place (for WAV). */
export function swapEndian(bytes: Uint8Array, width: number) {
  if (width === 1) {
    for (let i = 0; i < bytes.length; i++) bytes[i] = (bytes[i] + 128) & 255; // AIFF 8-bit signed -> WAV unsigned
    return;
  }
  for (let i = 0; i + width <= bytes.length; i += width) {
    for (let a = 0, z = width - 1; a < z; a++, z--) {
      const t = bytes[i + a]; bytes[i + a] = bytes[i + z]; bytes[i + z] = t;
    }
  }
}
