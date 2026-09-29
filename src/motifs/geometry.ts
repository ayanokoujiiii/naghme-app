/**
 * Pure geometry for Naghme's Iranian ornaments.
 * Every function returns SVG path strings, so the same shapes can be drawn by
 * react-native-svg in the app and by a browser in design previews.
 *
 * Motifs used here are deliberately secular and pre-modern Iranian:
 * crochet doilies (رومیزی قلاب‌بافی) from grandmothers' homes, carpet borders and the
 * central medallion (ترنج), the Persepolis lotus rosette, and the boteh (بته‌جقه) of termeh.
 */

const TAU = Math.PI * 2;
const f = (n: number) => (Math.round(n * 100) / 100).toString();

function polar(r: number, a: number, cx = 0, cy = 0): [number, number] {
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}
const P = ([x, y]: [number, number]) => `${f(x)} ${f(y)}`;

export function circle(cx: number, cy: number, r: number): string {
  return `M${f(cx - r)} ${f(cy)}a${f(r)} ${f(r)} 0 1 0 ${f(2 * r)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-2 * r)} 0`;
}

/** Small deterministic random generator so every artist gets its own doily. */
export function rng(seed: string | number) {
  let h = typeof seed === 'number' ? seed >>> 0 : 2166136261;
  if (typeof seed === 'string') for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return () => {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    return ((h >>> 0) % 100000) / 100000;
  };
}

/** A pointed petal between two radii. */
function petal(r0: number, r1: number, a: number, half: number, cx: number, cy: number): string {
  const p0 = polar(r0, a, cx, cy);
  const p1 = polar(r1, a, cx, cy);
  const mid = (r0 + r1) / 2;
  const c1 = polar(mid, a - half, cx, cy);
  const c2 = polar(mid, a + half, cx, cy);
  return `M${P(p0)}Q${P(c1)} ${P(p1)}Q${P(c2)} ${P(p0)}Z`;
}

export interface DoilyLayers {
  /** Fine thread lines (stroke only). */
  thread: string;
  /** Solid stitches: petals, picots and fans (low opacity fill + stroke). */
  body: string;
  /** Tiny eyelets / holes (stroke only, thinner). */
  eyelets: string;
  /** Outer radius actually used. */
  radius: number;
}

/**
 * A round crochet doily. Rings from the centre: flower, petal ring, chain mesh,
 * shell fans, eyelet row, scalloped edge with picots.
 */
export function doily(radius: number, seed: string | number = 'naghme', cx = radius, cy = radius): DoilyLayers {
  const rnd = rng(seed);
  const R = radius;
  const thread: string[] = [];
  const body: string[] = [];
  const eyelets: string[] = [];
  const petals = [8, 10, 12][Math.floor(rnd() * 3)];
  const turn = rnd() * TAU;

  // 1. centre flower
  body.push(circle(cx, cy, R * 0.035));
  thread.push(circle(cx, cy, R * 0.06));
  for (let i = 0; i < petals; i++) body.push(petal(R * 0.065, R * 0.16, turn + (i / petals) * TAU, 0.22, cx, cy));
  thread.push(circle(cx, cy, R * 0.18));

  // 2. main petal ring, alternating long/short
  const n2 = petals * 2;
  for (let i = 0; i < n2; i++) {
    const a = turn + (i / n2) * TAU;
    const long = i % 2 === 0;
    body.push(petal(R * 0.19, long ? R * 0.36 : R * 0.29, a, long ? 0.13 : 0.1, cx, cy));
  }
  thread.push(circle(cx, cy, R * 0.38));

  // 3. chain mesh, two staggered rows of loops
  const n3 = petals * 3;
  for (let row = 0; row < 2; row++) {
    const ri = R * (0.38 + row * 0.07);
    const ro = ri + R * 0.085;
    const off = row * (0.5 / n3) * TAU;
    for (let i = 0; i < n3; i++) {
      const a0 = turn + off + (i / n3) * TAU;
      const a1 = turn + off + ((i + 1) / n3) * TAU;
      thread.push(`M${P(polar(ri, a0, cx, cy))}Q${P(polar(ro, (a0 + a1) / 2, cx, cy))} ${P(polar(ri, a1, cx, cy))}`);
    }
  }
  thread.push(circle(cx, cy, R * 0.6));

  // 4. shell fans
  const n4 = petals * 2;
  for (let i = 0; i < n4; i++) {
    const ac = turn + ((i + 0.5) / n4) * TAU;
    const spread = (TAU / n4) * 0.42;
    const base = polar(R * 0.61, ac, cx, cy);
    for (let k = -2; k <= 2; k++) thread.push(`M${P(base)}L${P(polar(R * 0.74, ac + (k / 2) * spread, cx, cy))}`);
    body.push(`M${P(polar(R * 0.74, ac - spread, cx, cy))}Q${P(polar(R * 0.8, ac, cx, cy))} ${P(polar(R * 0.74, ac + spread, cx, cy))}Q${P(polar(R * 0.765, ac, cx, cy))} ${P(polar(R * 0.74, ac - spread, cx, cy))}Z`);
    body.push(circle(...polar(R * 0.625, ac, cx, cy), R * 0.012));
  }

  // 5. eyelet row
  const n5 = petals * 4;
  for (let i = 0; i < n5; i++) eyelets.push(circle(...polar(R * 0.83, turn + (i / n5) * TAU, cx, cy), R * 0.018));
  thread.push(circle(cx, cy, R * 0.86));

  // 6. scalloped edge with picots
  const n6 = petals * 4;
  let edge = '';
  for (let i = 0; i < n6; i++) {
    const a0 = turn + (i / n6) * TAU;
    const a1 = turn + ((i + 1) / n6) * TAU;
    const p0 = polar(R * 0.86, a0, cx, cy);
    const top = polar(R * 1.02, (a0 + a1) / 2, cx, cy);
    edge += `${i === 0 ? `M${P(p0)}` : ''}Q${P(top)} ${P(polar(R * 0.86, a1, cx, cy))}`;
    body.push(circle(...polar(R * 0.965, (a0 + a1) / 2, cx, cy), R * 0.012));
  }
  thread.push(edge);
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: R };
}

/**
 * Horizontal lace hem, like the edge of a crocheted curtain or table runner.
 * The straight side is at y=0 and scallops hang down to `height`.
 */
export function laceEdge(width: number, height: number, unit = height * 1.6): DoilyLayers {
  const n = Math.max(2, Math.round(width / unit));
  const u = width / n;
  const thread: string[] = [`M0 ${f(height * 0.08)}H${f(width)}`, `M0 ${f(height * 0.3)}H${f(width)}`];
  const body: string[] = [];
  const eyelets: string[] = [];
  let scallop = `M0 ${f(height * 0.3)}`;
  for (let i = 0; i < n; i++) {
    const x0 = i * u;
    const xm = x0 + u / 2;
    const x1 = x0 + u;
    eyelets.push(circle(x0 + u * 0.25, height * 0.19, height * 0.05), circle(x0 + u * 0.75, height * 0.19, height * 0.05));
    // fan inside each scallop
    for (let k = -2; k <= 2; k++) thread.push(`M${f(xm)} ${f(height * 0.32)}L${f(xm + k * u * 0.11)} ${f(height * 0.72)}`);
    scallop += `Q${f(xm)} ${f(height * 1.12)} ${f(x1)} ${f(height * 0.3)}`;
    body.push(circle(xm, height * 0.9, height * 0.045));
    body.push(`M${f(xm - u * 0.2)} ${f(height * 0.62)}Q${f(xm)} ${f(height * 0.84)} ${f(xm + u * 0.2)} ${f(height * 0.62)}Q${f(xm)} ${f(height * 0.72)} ${f(xm - u * 0.2)} ${f(height * 0.62)}Z`);
    body.push(circle(x1, height * 0.36, height * 0.035));
  }
  thread.push(scallop);
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: height };
}

/** Filet-crochet net used to fill a lace curtain panel: diamond mesh with tiny rosettes. */
export function laceNet(width: number, height: number, cell = 26): DoilyLayers {
  const thread: string[] = [];
  const body: string[] = [];
  const eyelets: string[] = [];
  const cols = Math.ceil(width / cell) + 1;
  const rows = Math.ceil(height / cell) + 1;
  for (let i = -rows; i <= cols; i++) {
    thread.push(`M${f(i * cell)} 0L${f(i * cell + rows * cell)} ${f(rows * cell)}`);
    thread.push(`M${f(i * cell)} 0L${f(i * cell - rows * cell)} ${f(rows * cell)}`);
  }
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cell + (r % 2 ? cell / 2 : 0);
      const y = r * cell + cell / 2;
      if ((r * 7 + c * 3) % 5 === 0) {
        for (let k = 0; k < 6; k++) body.push(petal(cell * 0.06, cell * 0.3, (k / 6) * TAU, 0.35, x, y));
      } else eyelets.push(circle(x, y, cell * 0.07));
    }
  }
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: cell };
}

/** The 12-petal lotus rosette carved along the stairways of Persepolis. */
export function rosette(radius: number, petals = 12, cx = radius, cy = radius): DoilyLayers {
  const R = radius;
  const body: string[] = [];
  const thread: string[] = [circle(cx, cy, R * 0.2), circle(cx, cy, R * 0.93)];
  const eyelets: string[] = [];
  body.push(circle(cx, cy, R * 0.1));
  for (let i = 0; i < petals; i++) {
    const a = (i / petals) * TAU - Math.PI / 2;
    body.push(petal(R * 0.22, R * 0.86, a, 0.16, cx, cy));
    thread.push(`M${P(polar(R * 0.26, a, cx, cy))}L${P(polar(R * 0.78, a, cx, cy))}`);
  }
  for (let i = 0; i < petals * 2; i++) eyelets.push(circle(...polar(R * 0.97, (i / (petals * 2)) * TAU, cx, cy), R * 0.025));
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: R };
}

/**
 * Carpet border band: guard stripes and a running chain of lozenges with hooked
 * side-leaves, a simplified version of the borders of Kashan and Tabriz rugs.
 */
export function carpetBand(width: number, height: number): DoilyLayers {
  const h = height;
  const unit = h * 1.5;
  const n = Math.max(2, Math.round(width / unit));
  const u = width / n;
  const thread: string[] = [
    `M0 ${f(h * 0.04)}H${f(width)}`, `M0 ${f(h * 0.14)}H${f(width)}`,
    `M0 ${f(h * 0.86)}H${f(width)}`, `M0 ${f(h * 0.96)}H${f(width)}`,
  ];
  const body: string[] = [];
  const eyelets: string[] = [];
  for (let i = 0; i < n; i++) {
    const cx = i * u + u / 2;
    const cy = h / 2;
    const w = u * 0.34;
    const hh = h * 0.3;
    body.push(`M${f(cx)} ${f(cy - hh)}L${f(cx + w)} ${f(cy)}L${f(cx)} ${f(cy + hh)}L${f(cx - w)} ${f(cy)}Z`);
    thread.push(`M${f(cx)} ${f(cy - hh * 0.5)}L${f(cx + w * 0.5)} ${f(cy)}L${f(cx)} ${f(cy + hh * 0.5)}L${f(cx - w * 0.5)} ${f(cy)}Z`);
    // hooked leaves between lozenges
    const x1 = i * u;
    thread.push(`M${f(x1)} ${f(cy)}Q${f(x1 + u * 0.08)} ${f(cy - hh)} ${f(x1 + u * 0.14)} ${f(cy - hh * 0.3)}`);
    thread.push(`M${f(x1)} ${f(cy)}Q${f(x1 - u * 0.08)} ${f(cy + hh)} ${f(x1 - u * 0.14)} ${f(cy + hh * 0.3)}`);
    eyelets.push(circle(x1, h * 0.09, h * 0.025), circle(x1 + u / 2, h * 0.91, h * 0.025));
  }
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: h };
}

/** Lobed carpet medallion (ترنج) with its two pendants (سرترنج). Centre at cx, cy. */
export function toranj(width: number, height: number, cx = width / 2, cy = height / 2): DoilyLayers {
  const rx = width * 0.34;
  const ry = height * 0.3;
  const shape = (sx: number, sy: number, lobes: number, depth: number) => {
    let d = '';
    const steps = 144;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * TAU;
      const k = 1 - depth * Math.abs(Math.sin((a * lobes) / 2));
      const x = cx + sx * k * Math.cos(a);
      const y = cy + sy * k * Math.sin(a);
      d += `${i === 0 ? 'M' : 'L'}${f(x)} ${f(y)}`;
    }
    return `${d}Z`;
  };
  const thread = [shape(rx, ry, 16, 0.07), shape(rx * 0.72, ry * 0.72, 12, 0.08)];
  const body = [shape(rx * 0.4, ry * 0.4, 8, 0.14)];
  // pendants
  for (const s of [-1, 1]) {
    const y0 = cy + s * ry * 0.98;
    const y1 = cy + s * (ry + height * 0.12);
    body.push(`M${f(cx - rx * 0.12)} ${f(y0)}Q${f(cx)} ${f(y1 + s * height * 0.03)} ${f(cx + rx * 0.12)} ${f(y0)}Z`);
    thread.push(`M${f(cx)} ${f(y1)}L${f(cx)} ${f(y1 + s * height * 0.05)}`);
  }
  const eyelets: string[] = [];
  for (let i = 0; i < 24; i++) eyelets.push(circle(...polar(1, (i / 24) * TAU, 0, 0).map((v, j) => (j === 0 ? cx + v * rx * 0.86 : cy + v * ry * 0.86)) as [number, number], Math.min(rx, ry) * 0.025));
  return { thread: thread.join(''), body: body.join(''), eyelets: eyelets.join(''), radius: Math.max(rx, ry) };
}

/** Boteh (بته‌جقه) of termeh cloth, inside a size x size box. */
export function boteh(size: number): DoilyLayers {
  const s = size;
  const outer = `M${f(s * 0.5)} ${f(s * 0.95)}C${f(s * 0.12)} ${f(s * 0.95)} ${f(s * 0.08)} ${f(s * 0.45)} ${f(s * 0.38)} ${f(s * 0.28)}C${f(s * 0.62)} ${f(s * 0.15)} ${f(s * 0.66)} ${f(s * 0.05)} ${f(s * 0.58)} ${f(s * 0.03)}C${f(s * 0.86)} ${f(s * 0.1)} ${f(s * 0.92)} ${f(s * 0.45)} ${f(s * 0.84)} ${f(s * 0.62)}C${f(s * 0.76)} ${f(s * 0.84)} ${f(s * 0.66)} ${f(s * 0.95)} ${f(s * 0.5)} ${f(s * 0.95)}Z`;
  const inner = `M${f(s * 0.5)} ${f(s * 0.82)}C${f(s * 0.28)} ${f(s * 0.82)} ${f(s * 0.26)} ${f(s * 0.52)} ${f(s * 0.44)} ${f(s * 0.42)}C${f(s * 0.6)} ${f(s * 0.34)} ${f(s * 0.74)} ${f(s * 0.46)} ${f(s * 0.7)} ${f(s * 0.62)}C${f(s * 0.66)} ${f(s * 0.76)} ${f(s * 0.6)} ${f(s * 0.82)} ${f(s * 0.5)} ${f(s * 0.82)}Z`;
  return { thread: outer, body: inner, eyelets: circle(s * 0.5, s * 0.64, s * 0.05), radius: s / 2 };
}
