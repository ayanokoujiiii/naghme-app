import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { C } from '../theme';

/**
 * «قاب نگارگری»: the illuminated frame of a Persian miniature page around the
 * artist's portrait. Gold rules (جدول‌کشی), lachak corners, small cartouches on
 * each side and a شمسه ring of dots around the round portrait, in the manner of
 * old book covers and miniature albums. Purely decorative, no religious motifs.
 */
export function MiniatureFrame({ size, inner, color = C.zar, children }: { size: number; inner: number; color?: string; children?: React.ReactNode }) {
  const s = size;
  const c = s / 2;
  const parts = useMemo(() => {
    const lachak = (cx: number, cy: number, sx: number, sy: number) => {
      const r = s * 0.2;
      // three-lobed quarter medallion reaching in from the corner
      const p = (a: number, rr: number) => [cx + sx * Math.cos(a) * rr, cy + sy * Math.sin(a) * rr];
      const [x0, y0] = p(0, r);
      const [x1, y1] = p(Math.PI / 4, r * 1.12);
      const [x2, y2] = p(Math.PI / 2, r);
      const [m0x, m0y] = p(Math.PI / 8, r * 1.28);
      const [m1x, m1y] = p((3 * Math.PI) / 8, r * 1.28);
      return `M${cx} ${cy}L${x0} ${y0}Q${m0x} ${m0y} ${x1} ${y1}Q${m1x} ${m1y} ${x2} ${y2}Z`;
    };
    const i = 8;
    const corners = [
      lachak(i, i, 1, 1),
      lachak(s - i, i, -1, 1),
      lachak(i, s - i, 1, -1),
      lachak(s - i, s - i, -1, -1),
    ];
    const dots: [number, number][] = [];
    const ring = inner / 2 + 9;
    for (let k = 0; k < 32; k++) {
      const a = (k / 32) * Math.PI * 2;
      dots.push([c + Math.cos(a) * ring, c + Math.sin(a) * ring]);
    }
    const lozenge = (x: number, y: number, rx: number, ry: number) => `M${x} ${y - ry}L${x + rx} ${y}L${x} ${y + ry}L${x - rx} ${y}Z`;
    const cartouches = [lozenge(c, 5, 9, 3.2), lozenge(c, s - 5, 9, 3.2), lozenge(5, c, 3.2, 9), lozenge(s - 5, c, 3.2, 9)];
    return { corners, dots, cartouches };
  }, [s, inner]);

  return (
    <View style={{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={s} height={s} style={{ position: 'absolute' }} pointerEvents="none">
        <Rect x={0.75} y={0.75} width={s - 1.5} height={s - 1.5} rx={3} fill="rgba(11,11,12,0.55)" stroke={color} strokeWidth={1.3} />
        <Rect x={4} y={4} width={s - 8} height={s - 8} rx={2} fill="none" stroke={color} strokeOpacity={0.6} strokeWidth={0.6} />
        <Rect x={8} y={8} width={s - 16} height={s - 16} rx={1.5} fill="none" stroke={color} strokeOpacity={0.4} strokeWidth={0.4} />
        {parts.corners.map((d, k) => (
          <Path key={k} d={d} fill={color} fillOpacity={0.18} stroke={color} strokeOpacity={0.8} strokeWidth={0.7} />
        ))}
        {parts.cartouches.map((d, k) => (
          <Path key={`c${k}`} d={d} fill={color} fillOpacity={0.55} />
        ))}
        <G>
          {parts.dots.map(([x, y], k) => (
            <Circle key={`d${k}`} cx={x} cy={y} r={k % 2 ? 0.9 : 1.5} fill={color} fillOpacity={k % 2 ? 0.5 : 0.9} />
          ))}
        </G>
        <Circle cx={c} cy={c} r={inner / 2 + 4} fill="none" stroke={color} strokeOpacity={0.75} strokeWidth={0.9} />
      </Svg>
      {children}
    </View>
  );
}
