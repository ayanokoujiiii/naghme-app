import { File } from 'expo-file-system';
import { BIT_REVERSE, DsdChannel, halvingsFor, parseAiffHeader, parseDsdHeader, swapEndian, toPcm24, wavHeader } from './dsp';

export type Progress = (fraction: number) => void;
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

export interface ConvertResult { sampleRate: number; bitDepth: number; channels: number; duration: number }

/**
 * DSD (DSF/DFF) -> 24-bit WAV. Android cannot decode DSD, so Naghme converts once on import
 * with a high quality multi-stage decimator. targetRate 88200 (hi-res) or 44100 (smaller files).
 */
export async function convertDsdToWav(srcUri: string, dest: File, targetRate: number, onProgress?: Progress): Promise<ConvertResult> {
  const src = new File(srcUri);
  const h = src.open();
  try {
    h.offset = 0;
    const head = h.readBytes(Math.min(65536, src.size ?? 65536));
    const info = parseDsdHeader(head);
    if (!info) throw new Error('ساختار فایل DSD شناخته نشد.');
    if (info.compressed) throw new Error('فایل‌های DSD فشرده (DST) هنوز پشتیبانی نمی‌شوند.');
    const nc = info.channels;
    const halvings = halvingsFor(info.sampleRate, targetRate);
    const outRate = info.sampleRate / 8 / Math.pow(2, halvings);
    const chans = Array.from({ length: nc }, () => new DsdChannel(halvings));
    const validBytesPerCh = info.container === 'dsf' ? Math.floor(info.sampleCount / 8) : Math.floor(info.dataBytes / nc);

    if (dest.exists) dest.delete();
    dest.create();
    const out = dest.open();
    out.writeBytes(wavHeader(0, outRate, nc, 24));
    let dataBytes = 0;

    const groupBytes = info.container === 'dsf' ? info.blockSize * nc : nc;
    const groupsPerRead = info.container === 'dsf' ? Math.max(1, Math.floor((512 * 1024) / groupBytes)) : Math.floor((512 * 1024) / nc);
    const readSize = groupsPerRead * groupBytes;
    const bufs = chans.map(() => new Float32Array(Math.ceil(readSize / nc) + 64));
    let consumedPerCh = 0;
    let pos = 0;

    while (pos < info.dataBytes && consumedPerCh < validBytesPerCh) {
      h.offset = info.dataOffset + pos;
      const len = Math.min(readSize, info.dataBytes - pos);
      const chunk = h.readBytes(len);
      if (!chunk.length) break;
      if (info.lsbFirst) for (let i = 0; i < chunk.length; i++) chunk[i] = BIT_REVERSE[chunk[i]];
      const counts = new Array(nc).fill(0);
      if (info.container === 'dsf') {
        const bs = info.blockSize;
        let perChThisRead = 0;
        for (let g = 0; g * groupBytes < chunk.length; g++) {
          const remaining = validBytesPerCh - consumedPerCh - perChThisRead;
          if (remaining <= 0) break;
          const take = Math.min(bs, remaining);
          for (let c = 0; c < nc; c++) {
            const s = g * groupBytes + c * bs;
            const e = Math.min(s + take, chunk.length);
            if (s < e) counts[c] = chans[c].process(chunk, s, e, 1, bufs[c], counts[c]);
          }
          perChThisRead += take;
        }
        consumedPerCh += perChThisRead;
      } else {
        for (let c = 0; c < nc; c++) counts[c] = chans[c].process(chunk, c, chunk.length, nc, bufs[c], 0);
        consumedPerCh += Math.floor(chunk.length / nc);
      }
      const frames = Math.min(...counts);
      if (frames > 0) {
        const pcm = toPcm24(bufs, frames, 1.4);
        out.writeBytes(pcm);
        dataBytes += pcm.length;
      }
      pos += len;
      onProgress?.(Math.min(1, pos / info.dataBytes));
      await tick();
    }
    out.offset = 0;
    out.writeBytes(wavHeader(dataBytes, outRate, nc, 24));
    out.close();
    return { sampleRate: outRate, bitDepth: 24, channels: nc, duration: dataBytes / (outRate * nc * 3) };
  } finally {
    h.close();
  }
}

/** AIFF (big-endian PCM) -> WAV, bit-exact. */
export async function convertAiffToWav(srcUri: string, dest: File, onProgress?: Progress): Promise<ConvertResult> {
  const src = new File(srcUri);
  const h = src.open();
  try {
    const head = h.readBytes(Math.min(65536, src.size ?? 65536));
    const info = parseAiffHeader(head);
    if (!info) throw new Error('این فایل AIFF قابل خواندن نیست.');
    const width = Math.ceil(info.bits / 8);
    if (dest.exists) dest.delete();
    dest.create();
    const out = dest.open();
    out.writeBytes(wavHeader(info.dataBytes, info.sampleRate, info.channels, width * 8));
    const step = width * info.channels * 65536;
    for (let pos = 0; pos < info.dataBytes; pos += step) {
      h.offset = info.dataOffset + pos;
      const chunk = h.readBytes(Math.min(step, info.dataBytes - pos));
      if (!info.littleEndian || width === 1) swapEndian(chunk, width);
      out.writeBytes(chunk);
      onProgress?.(Math.min(1, (pos + step) / info.dataBytes));
      await tick();
    }
    out.close();
    return { sampleRate: info.sampleRate, bitDepth: width * 8, channels: info.channels, duration: info.frames / info.sampleRate };
  } finally {
    h.close();
  }
}
