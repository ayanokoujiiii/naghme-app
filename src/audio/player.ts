import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';
import { PermissionsAndroid, Platform } from 'react-native';
import { playingFlag } from './levels';
import { getSetting, logPlayProgress, logPlayStart, setDuration, setSetting } from '../db/repo';

export interface QueueItem {
  id: string; // recording id
  uri: string;
  title: string;
  artist: string;
  cover: string | null;
  lyrics: string | null;
  workId: string | null;
  duration: number | null;
}

export type RepeatMode = 'off' | 'all' | 'one';

interface PlayerState {
  queue: QueueItem[];
  index: number;
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  repeat: RepeatMode;
  shuffle: boolean;
  sleepEndsAt: number | null;
  sleepAfterTrack: boolean;
  error: string | null;
}

export const usePlayer = create<PlayerState>(() => ({
  queue: [],
  index: -1,
  playing: false,
  buffering: false,
  position: 0,
  duration: 0,
  repeat: 'off',
  shuffle: false,
  sleepEndsAt: null,
  sleepAfterTrack: false,
  error: null,
}));

export const currentItem = (s: PlayerState = usePlayer.getState()) => (s.index >= 0 ? s.queue[s.index] ?? null : null);

let player: AudioPlayer | null = null;
let loadedId: string | null = null;
let session: { historyId: string | null; recId: string; listened: number; lastPos: number } | null = null;
let shuffleOrder: number[] = [];
let sleepTimer: ReturnType<typeof setInterval> | null = null;
let finishing = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function set(p: Partial<PlayerState>) {
  usePlayer.setState(p);
  if ('queue' in p || 'index' in p || 'repeat' in p || 'shuffle' in p) schedulePersist();
}

function schedulePersist() {
  if (persistTimer) clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const s = usePlayer.getState();
    void setSetting('player', JSON.stringify({ queue: s.queue, index: s.index, position: s.position, repeat: s.repeat, shuffle: s.shuffle })).catch(() => undefined);
  }, 800);
}

let notifAsked = false;
/** Android 13+ needs this permission to show the media controls in the notification shade. */
async function askNotificationPermission() {
  if (notifAsked || Platform.OS !== 'android' || Number(Platform.Version) < 33) return;
  notifAsked = true;
  try {
    await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any);
  } catch {
    /* the music still plays; only the notification controls are missing */
  }
}

async function ensurePlayer(): Promise<AudioPlayer> {
  if (player) return player;
  // v1.1: keep playing when the app is closed or the screen is locked.
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    interruptionModeAndroid: 'doNotMix',
    allowsRecording: false,
  } as any).catch(() => undefined);
  player = createAudioPlayer(null);
  player.addListener('playbackStatusUpdate', onStatus);
  // v1.1: live audio sampling removed. On Android it relies on the Visualizer
  // API, which needs the microphone permission this app deliberately blocks,
  // and it could stop playback. The ornaments use their calm synthetic breath.
  return player;
}

/** Show the track on the lock screen and in the notification shade (keeps playback alive in background). */
function showOnLockScreen(p: AudioPlayer, item: QueueItem) {
  try {
    (p as any).setActiveForLockScreen?.(
      true,
      { title: item.title, artist: item.artist || 'نغمه', albumTitle: 'نغمه', artworkUrl: item.cover ?? undefined },
      { showSeekForward: true, showSeekBackward: true },
    );
  } catch {
    /* lock screen controls are optional */
  }
}

function onStatus(st: AudioStatus) {
  const s = usePlayer.getState();
  const cur = currentItem(s);
  if (session && st.playing) {
    const d = st.currentTime - session.lastPos;
    if (d > 0 && d < 3) session.listened += d;
  }
  if (session) session.lastPos = st.currentTime;
  const patch: Partial<PlayerState> = {
    playing: st.playing,
    buffering: st.isBuffering,
    position: st.currentTime || 0,
  };
  if (st.duration && isFinite(st.duration) && st.duration > 0) {
    patch.duration = st.duration;
    if (cur && !cur.duration) {
      cur.duration = st.duration;
      void setDuration(cur.id, st.duration).catch(() => undefined);
    }
  }
  usePlayer.setState(patch);
  playingFlag.value = st.playing ? 1 : 0;
  if (s.playing && !st.playing) schedulePersist();
  if (st.didJustFinish && !finishing) {
    finishing = true;
    void onFinished().finally(() => {
      finishing = false;
    });
  }
}

async function closeSession() {
  if (!session) return;
  const s = session;
  session = null;
  if (s.historyId) {
    const dur = usePlayer.getState().duration;
    await logPlayProgress(s.historyId, s.listened, dur ? Math.min(100, (s.listened / dur) * 100) : null).catch(() => undefined);
  }
}

async function load(index: number, autoplay: boolean, startAt = 0) {
  const s = usePlayer.getState();
  const item = s.queue[index];
  if (!item) return;
  const p = await ensurePlayer();
  await closeSession();
  set({ index, position: startAt, duration: item.duration ?? 0, error: null, buffering: true });
  try {
    if (loadedId !== item.id) {
      p.replace({ uri: item.uri });
      loadedId = item.id;
    }
    if (startAt > 0) await p.seekTo(startAt);
    if (autoplay) {
      void askNotificationPermission();
      p.play();
      showOnLockScreen(p, item);
      session = { historyId: null, recId: item.id, listened: 0, lastPos: startAt };
      const sess = session;
      logPlayStart(item.id).then((hid) => {
        if (session === sess) sess.historyId = hid;
      }).catch(() => undefined);
    }
  } catch {
    set({ error: 'پخش این فایل ممکن نشد.', playing: false });
  }
}

async function onFinished() {
  const s = usePlayer.getState();
  if (s.sleepAfterTrack) {
    cancelSleep();
    player?.pause();
    await closeSession();
    return;
  }
  if (s.repeat === 'one') {
    await closeSession();
    await load(s.index, true, 0);
    return;
  }
  const next = nextIndex(1);
  if (next === null) {
    await closeSession();
    set({ playing: false, position: 0 });
    return;
  }
  await load(next, true);
}

function buildShuffle(len: number, first: number) {
  const rest = Array.from({ length: len }, (_, i) => i).filter((i) => i !== first);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  shuffleOrder = [first, ...rest];
}

function nextIndex(dir: 1 | -1): number | null {
  const s = usePlayer.getState();
  const n = s.queue.length;
  if (!n) return null;
  if (s.shuffle) {
    if (shuffleOrder.length !== n) buildShuffle(n, s.index);
    const pos = shuffleOrder.indexOf(s.index) + dir;
    if (pos >= 0 && pos < n) return shuffleOrder[pos];
    return s.repeat === 'all' ? shuffleOrder[dir === 1 ? 0 : n - 1] : null;
  }
  const i = s.index + dir;
  if (i >= 0 && i < n) return i;
  return s.repeat === 'all' ? (dir === 1 ? 0 : n - 1) : null;
}

/* ---------- public API ---------- */

export async function playQueue(items: QueueItem[], startIndex = 0) {
  const playable = items.filter((i) => !!i.uri);
  if (!playable.length) return;
  const startId = items[startIndex]?.id;
  const idx = Math.max(0, playable.findIndex((i) => i.id === startId));
  set({ queue: playable, index: idx });
  if (usePlayer.getState().shuffle) buildShuffle(playable.length, idx);
  loadedId = null;
  await load(idx, true);
}

export async function togglePlay() {
  const p = await ensurePlayer();
  const s = usePlayer.getState();
  if (!currentItem(s)) return;
  if (loadedId !== currentItem(s)!.id) {
    await load(s.index, true, s.position);
    return;
  }
  if (p.playing) p.pause();
  else {
    p.play();
    showOnLockScreen(p, currentItem(s)!);
    if (!session) {
      const item = currentItem(s)!;
      session = { historyId: null, recId: item.id, listened: 0, lastPos: p.currentTime };
      const sess = session;
      logPlayStart(item.id).then((hid) => { if (session === sess) sess.historyId = hid; }).catch(() => undefined);
    }
  }
}

export async function next() {
  const i = nextIndex(1);
  if (i !== null) await load(i, true);
}

export async function previous() {
  const s = usePlayer.getState();
  if (s.position > 4 && player) {
    await player.seekTo(0);
    return;
  }
  const i = nextIndex(-1);
  if (i !== null) await load(i, true);
  else if (player) await player.seekTo(0);
}

export async function seek(sec: number) {
  const p = await ensurePlayer();
  if (session) session.lastPos = sec;
  usePlayer.setState({ position: sec });
  await p.seekTo(Math.max(0, sec));
}

export async function jumpTo(index: number) {
  await load(index, true);
}

export function cycleRepeat() {
  const r = usePlayer.getState().repeat;
  set({ repeat: r === 'off' ? 'all' : r === 'all' ? 'one' : 'off' });
}

export function toggleShuffle() {
  const s = usePlayer.getState();
  if (!s.shuffle) buildShuffle(s.queue.length, Math.max(0, s.index));
  set({ shuffle: !s.shuffle });
}

export function playNext(item: QueueItem) {
  const s = usePlayer.getState();
  if (!s.queue.length) {
    void playQueue([item], 0);
    return;
  }
  const q = s.queue.filter((x) => x.id !== item.id);
  const at = Math.max(0, q.findIndex((x) => x.id === currentItem(s)?.id)) + 1;
  q.splice(at, 0, item);
  set({ queue: q, index: q.findIndex((x) => x.id === currentItem(s)?.id) });
  shuffleOrder = [];
}

export function removeFromQueue(index: number) {
  const s = usePlayer.getState();
  if (index === s.index) return;
  const q = s.queue.slice();
  q.splice(index, 1);
  set({ queue: q, index: index < s.index ? s.index - 1 : s.index });
  shuffleOrder = [];
}

export function setSleep(minutes: number | 'track' | null) {
  cancelSleep();
  if (minutes === null) return;
  if (minutes === 'track') {
    set({ sleepAfterTrack: true });
    return;
  }
  const endsAt = Date.now() + minutes * 60000;
  set({ sleepEndsAt: endsAt });
  sleepTimer = setInterval(() => {
    if (Date.now() >= endsAt) {
      player?.pause();
      cancelSleep();
    }
  }, 1000);
}

export function cancelSleep() {
  if (sleepTimer) clearInterval(sleepTimer);
  sleepTimer = null;
  set({ sleepEndsAt: null, sleepAfterTrack: false });
}

export async function stopPlayback() {
  await closeSession();
  player?.pause();
  try { (player as any)?.setActiveForLockScreen?.(false); } catch { /* ignore */ }
  loadedId = null;
  set({ queue: [], index: -1, playing: false, position: 0, duration: 0 });
}

/** Called when a recording is deleted or its audio replaced. */
export function forgetLoaded(recordingId: string) {
  if (loadedId === recordingId) loadedId = null;
}

export async function restorePlayer() {
  try {
    const raw = await getSetting('player');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (!Array.isArray(saved.queue) || !saved.queue.length) return;
    usePlayer.setState({
      queue: saved.queue,
      index: Math.min(Math.max(0, saved.index ?? 0), saved.queue.length - 1),
      position: Number(saved.position) || 0,
      repeat: saved.repeat ?? 'off',
      shuffle: !!saved.shuffle,
    });
  } catch {
    /* ignore */
  }
}
