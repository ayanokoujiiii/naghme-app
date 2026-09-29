/** Pure galaxy layout: two spiral arms (Persian and classical) plus a core for everything else. */
import { hash, yearOf } from '../utils';

export interface GNode {
  id: string;
  name: string;
  tradition: string;
  photo: string | null;
  born: string | null;
  died: string | null;
  weight: number;
  x: number; y: number; z: number;
  size: number;
  color: string;
}
export interface GEdge { a: number; b: number; kind: string; implicit: boolean }
export interface GalaxyModel {
  nodes: GNode[];
  edges: GEdge[];
  dust: Float32Array; // x,y,z,colorIndex (0 persian, 1 classical, 2 other)
  stars: Float32Array; // x,y,z,brightness
}

export const ARM_COLORS = ['#CDB68C', '#A9BCCB', '#BDB4CC'];
const ARM_OFFSET: Record<string, number> = { persian: 0, classical: Math.PI, other: Math.PI / 2 };
const ARM_INDEX: Record<string, number> = { persian: 0, classical: 1, other: 2 };
const TWIST = 2.4;
const R0 = 70;
const R1 = 360;

function armPoint(offset: number, u: number, jitter: number, seed: number) {
  const r = R0 + u * (R1 - R0) + (hash(`${seed}r`) - 0.5) * jitter;
  const th = offset + u * TWIST + (hash(`${seed}t`) - 0.5) * (jitter / 260);
  const thick = 34 * (1 - u * 0.6);
  return { x: r * Math.cos(th), y: (hash(`${seed}y`) - 0.5) * thick, z: r * Math.sin(th) };
}

export function buildGalaxy(
  artists: { id: string; name: string; tradition: string; photo: string | null; born: string | null; died: string | null; weight: number }[],
  relations: { fromId: string; toId: string; kind: string }[],
  shared: { a: string; b: string }[] = [],
): GalaxyModel {
  const groups: Record<string, typeof artists> = { persian: [], classical: [], other: [] };
  for (const a of artists) (groups[a.tradition] ?? groups.other).push(a);

  const nodes: GNode[] = [];
  for (const [trad, list] of Object.entries(groups)) {
    const years = list.map((a) => yearOf(a.born)).filter((y): y is number => y !== null).sort((x, y) => x - y);
    const median = years.length ? years[Math.floor(years.length / 2)] : 1900;
    const sorted = list.slice().sort((a, b) => (yearOf(a.born) ?? median) - (yearOf(b.born) ?? median) || a.name.localeCompare(b.name));
    sorted.forEach((a, i) => {
      const u = sorted.length <= 1 ? 0.35 : 0.08 + (i / (sorted.length - 1)) * 0.84;
      let p;
      if (trad === 'other') {
        const ang = hash(a.id) * Math.PI * 2;
        const rr = 20 + hash(`${a.id}q`) * 80;
        p = { x: Math.cos(ang) * rr, y: (hash(`${a.id}y`) - 0.5) * 40, z: Math.sin(ang) * rr };
      } else {
        p = armPoint(ARM_OFFSET[trad], u, 46, hash(a.id) * 1e6);
      }
      nodes.push({
        ...a,
        ...p,
        size: Math.min(11, 3.2 + Math.sqrt(Math.max(0, a.weight)) * 1.5),
        color: ARM_COLORS[ARM_INDEX[trad] ?? 2],
      });
    });
  }

  const index = new Map(nodes.map((n, i) => [n.id, i]));
  const edges: GEdge[] = [];
  const seen = new Set<string>();
  for (const r of relations) {
    const a = index.get(r.fromId), b = index.get(r.toId);
    if (a === undefined || b === undefined) continue;
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push({ a, b, kind: r.kind, implicit: false });
  }
  for (const s of shared) {
    const a = index.get(s.a), b = index.get(s.b);
    if (a === undefined || b === undefined) continue;
    const k = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(k)) continue;
    seen.add(k);
    edges.push({ a, b, kind: 'shared', implicit: true });
  }

  // Spiral dust: gives the galaxy its shape even with few artists.
  const DUST = 1300;
  const dust = new Float32Array(DUST * 4);
  for (let i = 0; i < DUST; i++) {
    const arm = i % 5 === 4 ? 2 : i % 2;
    const u = Math.pow(hash(`d${i}u`), 0.8);
    let p;
    if (arm === 2) {
      const ang = hash(`d${i}a`) * Math.PI * 2;
      const rr = Math.pow(hash(`d${i}r`), 1.6) * 120;
      p = { x: Math.cos(ang) * rr, y: (hash(`d${i}y`) - 0.5) * 30, z: Math.sin(ang) * rr };
    } else {
      p = armPoint(arm === 0 ? ARM_OFFSET.persian : ARM_OFFSET.classical, u, 120, i + 0.5);
    }
    dust.set([p.x, p.y, p.z, arm], i * 4);
  }

  const STARS = 650;
  const stars = new Float32Array(STARS * 4);
  for (let i = 0; i < STARS; i++) {
    const th = hash(`s${i}a`) * Math.PI * 2;
    const ph = Math.acos(2 * hash(`s${i}b`) - 1);
    const r = 900 + hash(`s${i}c`) * 900;
    stars.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph), r * Math.sin(ph) * Math.sin(th), 0.2 + hash(`s${i}d`) * 0.8], i * 4);
  }
  return { nodes, edges, dust, stars };
}

export function neighborsOf(model: GalaxyModel, idx: number): number[] {
  const out: number[] = [];
  for (const e of model.edges) {
    if (e.a === idx) out.push(e.b);
    else if (e.b === idx) out.push(e.a);
  }
  return out;
}
