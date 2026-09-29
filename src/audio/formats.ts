export type FormatInfo = { ext: string; label: string; native: boolean; convert?: 'dsd' | 'aiff'; hires?: boolean };

/** Formats the Android engine plays directly, plus the ones Naghme converts on import. */
export const FORMATS: FormatInfo[] = [
  { ext: 'flac', label: 'FLAC', native: true, hires: true },
  { ext: 'wav', label: 'WAV', native: true, hires: true },
  { ext: 'mp3', label: 'MP3', native: true },
  { ext: 'm4a', label: 'AAC / ALAC', native: true, hires: true },
  { ext: 'aac', label: 'AAC', native: true },
  { ext: 'alac', label: 'ALAC', native: true, hires: true },
  { ext: 'ogg', label: 'OGG Vorbis', native: true },
  { ext: 'oga', label: 'OGG', native: true },
  { ext: 'opus', label: 'Opus', native: true },
  { ext: 'mka', label: 'Matroska Audio', native: true },
  { ext: 'webm', label: 'WebM Audio', native: true },
  { ext: 'mp4', label: 'MP4 Audio', native: true },
  { ext: '3gp', label: '3GP', native: true },
  { ext: 'amr', label: 'AMR', native: true },
  { ext: 'dsf', label: 'DSD (Sony DSF)', native: false, convert: 'dsd', hires: true },
  { ext: 'dff', label: 'DSD (DSDIFF)', native: false, convert: 'dsd', hires: true },
  { ext: 'aif', label: 'AIFF', native: false, convert: 'aiff', hires: true },
  { ext: 'aiff', label: 'AIFF', native: false, convert: 'aiff', hires: true },
];

export function extOf(name: string): string {
  const clean = name.split(/[?#]/)[0];
  const i = clean.lastIndexOf('.');
  return i >= 0 ? clean.slice(i + 1).toLowerCase() : '';
}

export function formatOf(name: string): FormatInfo | null {
  return FORMATS.find((f) => f.ext === extOf(name)) ?? null;
}

export function qualityLabel(r: { format?: string | null; sampleRate?: number | null; bitDepth?: number | null }): string {
  const parts: string[] = [];
  if (r.format) parts.push(r.format.toUpperCase());
  if (r.bitDepth) parts.push(`${r.bitDepth}bit`);
  if (r.sampleRate) {
    if (r.sampleRate >= 2822400) parts.push(`DSD${Math.round(r.sampleRate / 44100)}`);
    else parts.push(`${(r.sampleRate / 1000).toFixed(r.sampleRate % 1000 ? 1 : 0)}kHz`);
  }
  return parts.join(' · ');
}

export function isHiRes(r: { sampleRate?: number | null; bitDepth?: number | null; format?: string | null }): boolean {
  return (r.bitDepth ?? 0) >= 24 || (r.sampleRate ?? 0) > 48000 || r.format === 'dsf' || r.format === 'dff';
}
