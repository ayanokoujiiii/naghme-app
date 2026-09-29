import { Directory, File, Paths } from 'expo-file-system';
import { uid } from '../utils';

function ensureDir(...parts: string[]): Directory {
  const d = new Directory(Paths.document, ...parts);
  if (!d.exists) d.create({ intermediates: true });
  return d;
}

export const musicDir = () => ensureDir('music');
export const imagesDir = () => ensureDir('images');
export const tempDir = () => {
  const d = new Directory(Paths.cache, 'naghme-tmp');
  if (!d.exists) d.create({ intermediates: true });
  return d;
};

export function extFromName(name: string, fallback = 'bin'): string {
  const m = name.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]{2,5})$/);
  return m ? m[1].toLowerCase() : fallback;
}

/** Copy a picked image into the app's private folder so it survives cache cleanup. */
export function persistImage(uri: string): string {
  if (uri.includes('/images/') && uri.startsWith(Paths.document.uri)) return uri;
  const src = new File(uri);
  const dest = new File(imagesDir(), `${uid('img_')}.${extFromName(uri, 'jpg')}`);
  src.copy(dest);
  return dest.uri;
}

export function saveImageBytes(bytes: Uint8Array, mime: string): string {
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const dest = new File(imagesDir(), `${uid('img_')}.${ext}`);
  dest.create();
  dest.write(bytes);
  return dest.uri;
}

export async function downloadImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = new Uint8Array(await res.arrayBuffer());
    const type = res.headers.get('content-type') || 'image/jpeg';
    return saveImageBytes(buf, type);
  } catch {
    return null;
  }
}

export function deleteFileSafe(uri?: string | null) {
  if (!uri || !uri.startsWith('file:')) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    /* ignore */
  }
}

export function fileExists(uri?: string | null): boolean {
  if (!uri) return false;
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

export function folderSize(dir: Directory): number {
  let total = 0;
  try {
    for (const item of dir.list()) {
      if (item instanceof File) total += item.size ?? 0;
      else if (item instanceof Directory) total += folderSize(item);
    }
  } catch {
    /* ignore */
  }
  return total;
}
