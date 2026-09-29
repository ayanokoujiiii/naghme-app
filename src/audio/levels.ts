import { makeMutable } from 'react-native-reanimated';

/**
 * Live loudness of what is playing, shared with the UI thread so ornaments can
 * breathe with the music. Values are smoothed and roughly 0..1.
 *  level: overall energy, low: body of the sound (voice, tar, cello), high: sparkle (santur strokes, violin bow).
 * When the device does not deliver audio samples, `real` stays 0 and visuals
 * fall back to a calm synthetic breath driven by the play state.
 */
export const level = makeMutable(0);
export const low = makeMutable(0);
export const high = makeMutable(0);
export const real = makeMutable(0);
export const playingFlag = makeMutable(0);

let last = 0;

export function onAudioSample(sample: any) {
  const now = Date.now();
  if (now - last < 33) return;
  last = now;
  const frames: number[] | undefined = sample?.channels?.[0]?.frames;
  if (!frames || !frames.length) return;
  let sum = 0;
  let lowSum = 0;
  let highSum = 0;
  let lp = 0;
  let prev = frames[0];
  const step = Math.max(1, Math.floor(frames.length / 512));
  let n = 0;
  for (let i = 0; i < frames.length; i += step) {
    const v = frames[i];
    sum += v * v;
    lp += (v - lp) * 0.08;
    lowSum += lp * lp;
    const d = v - prev;
    highSum += d * d;
    prev = v;
    n++;
  }
  const rms = Math.sqrt(sum / n);
  const l = Math.min(1, Math.sqrt(lowSum / n) * 4);
  const h = Math.min(1, Math.sqrt(highSum / n) * 6);
  const e = Math.min(1, rms * 3.2);
  level.value = level.value * 0.6 + e * 0.4;
  low.value = low.value * 0.65 + l * 0.35;
  high.value = high.value * 0.5 + h * 0.5;
  real.value = 1;
}

export function resetLevels() {
  level.value = 0;
  low.value = 0;
  high.value = 0;
}
