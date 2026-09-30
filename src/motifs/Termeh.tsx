import React, { createContext, useContext, useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { C } from '../theme';
import { boteh } from './geometry';

let seq = 0;

/**
 * «بافت ترمه»: the woven cloth of Yazd behind cards.
 * v1.1: five different weaves instead of one, clearly visible, each with its
 * own pair of thread colours, so every part of the app has its own cloth.
 *   boteh    بته‌جقه      gold + pomegranate orange
 *   sarv     سرو          gold + turquoise
 *   gol      گل‌وبوته     lacquer red + gold
 *   gereh    گره‌چینی     silver + lapis
 *   ab       نقش آب       turquoise + silver
 */
export type TermehPattern = 'boteh' | 'sarv' | 'gol' | 'gereh' | 'ab';

export const TERMEH_COLORS: Record<TermehPattern, [string, string]> = {
  boteh: [C.zar, C.narenj],
  sarv: [C.zar, C.firouzeh],
  gol: [C.laki, C.zarBright],
  gereh: [C.noghre, C.lajvard],
  ab: [C.firouzeh, C.noghre],
};

/** Each screen can choose its own cloth; cards inside inherit it. */
const TermehCtx = createContext<TermehPattern>('boteh');
export function TermehProvider({ pattern, children }: { pattern: TermehPattern; children: React.ReactNode }) {
  return <TermehCtx.Provider value={pattern}>{children}</TermehCtx.Provider>;
}
export const useTermehPattern = () => useContext(TermehCtx);

const f = (n: number) => n.toFixed(1);

function cypress(x: number, y: number, h: number) {
  const w = h * 0.24;
  return {
    body: `M${f(x)} ${f(y + h)}C${f(x - w)} ${f(y + h * 0.72)} ${f(x - w * 0.9)} ${f(y + h * 0.35)} ${f(x)} ${f(y)}C${f(x + w * 0.9)} ${f(y + h * 0.35)} ${f(x + w)} ${f(y + h * 0.72)} ${f(x)} ${f(y + h)}Z`,
    line: `M${f(x)} ${f(y + h - 1)}V${f(y + 3)}M${f(x)} ${f(y)}Q${f(x + 2)} ${f(y - 3)} ${f(x + 4.5)} ${f(y - 2)}M${f(x - 3)} ${f(y + h * 0.55)}L${f(x)} ${f(y + h * 0.45)}L${f(x + 3)} ${f(y + h * 0.55)}`,
  };
}

function rosette6(cx: number, cy: number, r: number) {
  let d = '';
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const px = cx + Math.cos(a) * r * 0.62, py = cy + Math.sin(a) * r * 0.62, pr = r * 0.42;
    d += `M${f(px - pr)} ${f(py)}a${f(pr)} ${f(pr)} 0 1 0 ${f(2 * pr)} 0a${f(pr)} ${f(pr)} 0 1 0 ${f(-2 * pr)} 0`;
  }
  return d;
}

function star8(cx: number, cy: number, r: number) {
  let d = '';
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2 - Math.PI / 2;
    const rr = k % 2 ? r * 0.45 : r;
    d += `${k ? 'L' : 'M'}${f(cx + Math.cos(a) * rr)} ${f(cy + Math.sin(a) * rr)}`;
  }
  return d + 'Z';
}

function dot(cx: number, cy: number, r: number) {
  return `M${f(cx - r)} ${f(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
}

function Cell({ pattern, c1, c2, o }: { pattern: TermehPattern; c1: string; c2: string; o: number }) {
  if (pattern === 'boteh') {
    const L = boteh(13);
    return (
      <>
        <Rect x={0} y={0} width={0.6} height={34} fill={c2} fillOpacity={o * 0.8} />
        <Rect x={15} y={0} width={0.4} height={34} fill={c1} fillOpacity={o * 0.6} />
        <G transform="translate(2 2)">
          <Path d={L.thread} fill="none" stroke={c1} strokeOpacity={o * 2} strokeWidth={0.7} />
          <Path d={L.body} fill={c2} fillOpacity={o * 1.3} />
        </G>
        <G transform="translate(30 19) scale(-1 1)">
          <Path d={L.thread} fill="none" stroke={c1} strokeOpacity={o * 2} strokeWidth={0.7} />
          <Path d={L.body} fill={c2} fillOpacity={o * 1.3} />
        </G>
      </>
    );
  }
  if (pattern === 'sarv') {
    const a = cypress(7, 4, 18), b = cypress(21, 26, 18);
    return (
      <>
        <Path d={a.body + b.body} fill={c1} fillOpacity={o * 1.2} />
        <Path d={a.line + b.line} fill="none" stroke={c2} strokeOpacity={o * 2.2} strokeWidth={0.7} strokeLinecap="round" />
        <Path d={dot(21, 12, 1.1) + dot(7, 34, 1.1)} fill={c2} fillOpacity={o * 2} />
      </>
    );
  }
  if (pattern === 'gol') {
    return (
      <>
        <Path d={rosette6(8, 8, 6) + rosette6(23, 23, 4.2)} fill={c1} fillOpacity={o * 1.4} />
        <Path d={dot(8, 8, 1.4) + dot(23, 23, 1)} fill={c2} fillOpacity={o * 2.4} />
        <Path d="M8 14Q10 19 15 20M23 18Q21 13 16 12" fill="none" stroke={c2} strokeOpacity={o * 1.8} strokeWidth={0.7} />
        <Path d="M15 20q2 -3 4 -1q-2 2 -4 1ZM16 12q-2 3 -4 1q2 -2 4 -1Z" fill={c2} fillOpacity={o * 1.6} />
      </>
    );
  }
  if (pattern === 'gereh') {
    return (
      <>
        <Path d="M13 0L26 13L13 26L0 13Z" fill="none" stroke={c1} strokeOpacity={o * 1.8} strokeWidth={0.6} />
        <Path d={star8(13, 13, 5.5)} fill={c2} fillOpacity={o * 1.5} stroke={c1} strokeOpacity={o * 1.8} strokeWidth={0.5} />
        <Path d={dot(0, 0, 1.3) + dot(26, 0, 1.3) + dot(0, 26, 1.3) + dot(26, 26, 1.3)} fill={c1} fillOpacity={o * 2.2} />
      </>
    );
  }
  // ab: water
  return (
    <>
      <Path d="M0 8Q8 2 16 8T32 8" fill="none" stroke={c1} strokeOpacity={o * 2} strokeWidth={0.8} />
      <Path d="M0 12Q8 6 16 12T32 12" fill="none" stroke={c2} strokeOpacity={o * 1.2} strokeWidth={0.5} />
      <Path d={dot(8, 15, 1) + dot(24, 3, 1)} fill={c2} fillOpacity={o * 2} />
    </>
  );
}

const SIZE: Record<TermehPattern, [number, number]> = { boteh: [30, 34], sarv: [28, 44], gol: [30, 30], gereh: [26, 26], ab: [32, 16] };

export function Termeh({ pattern, color, color2, opacity = 0.14 }: { pattern?: TermehPattern; color?: string; color2?: string; opacity?: number }) {
  const ctx = useTermehPattern();
  const p = pattern ?? ctx;
  const id = useRef(`termeh${++seq}`).current;
  const [c1, c2] = TERMEH_COLORS[p];
  const [w, h] = SIZE[p];
  const cell = useMemo(() => <Cell pattern={p} c1={color ?? c1} c2={color2 ?? c2} o={opacity} />, [p, color, color2, opacity, c1, c2]);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={`${id}${p}`} patternUnits="userSpaceOnUse" width={w} height={h}>
          {cell}
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id}${p})`} />
    </Svg>
  );
}
