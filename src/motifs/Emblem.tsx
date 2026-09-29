import React from 'react';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import type { Emblem as EmblemKind } from '../mood';

/** Small hand-drawn emblems of the Iranian festivals: سبزه، آب، مهر، انار، آتش. */
export function Emblem({ kind, size = 40, color, accent }: { kind: EmblemKind; size?: number; color: string; accent: string }) {
  const s = size;
  return (
    <Svg width={s} height={s} viewBox="0 0 40 40" pointerEvents="none">
      {kind === 'sabzeh' ? (
        <G>
          {/* sprouts in a low bowl, tied with a ribbon */}
          {[-9, -5, -1.5, 2, 5.5, 9].map((dx, i) => (
            <Path key={i} d={`M${20 + dx * 0.5} 27 Q${20 + dx * 0.8} ${18 - (i % 2) * 3} ${20 + dx} ${8 + (i % 3) * 2}`} stroke={color} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          ))}
          <Path d="M8 26 Q20 36 32 26 Z" fill={accent} fillOpacity={0.85} />
          <Path d="M10 28.5 H30" stroke="#B23A48" strokeWidth={1.6} strokeLinecap="round" />
        </G>
      ) : kind === 'water' ? (
        <G>
          <Path d="M20 6 C24 13 27 17 27 21 A7 7 0 0 1 13 21 C13 17 16 13 20 6 Z" fill={color} fillOpacity={0.85} />
          <Path d="M6 31 Q10 28 14 31 T22 31 T30 31 T38 31" stroke={accent} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <Path d="M6 35 Q10 32 14 35 T22 35 T30 35 T38 35" stroke={accent} strokeWidth={1} strokeOpacity={0.6} fill="none" strokeLinecap="round" />
        </G>
      ) : kind === 'sun' ? (
        <G>
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r1 = 10.5;
            const r2 = i % 2 ? 15 : 17.5;
            return <Path key={i} d={`M${20 + Math.cos(a) * r1} ${20 + Math.sin(a) * r1} L${20 + Math.cos(a) * r2} ${20 + Math.sin(a) * r2}`} stroke={accent} strokeWidth={1.4} strokeLinecap="round" />;
          })}
          <Circle cx={20} cy={20} r={8} fill={color} />
          <Circle cx={20} cy={20} r={4.5} fill="none" stroke={accent} strokeWidth={0.8} />
        </G>
      ) : kind === 'pomegranate' ? (
        <G>
          <Path d="M16 9 L17.5 5.5 L20 8 L22.5 5.5 L24 9 Z" fill={accent} />
          <Circle cx={20} cy={22} r={13} fill={color} />
          <Path d="M12 18 Q14 13 19 12" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          {[[17, 24], [21, 21], [24, 25], [19, 28], [22.5, 29]].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx={1.3} ry={1.7} fill="#F2C6CB" fillOpacity={0.8} />
          ))}
        </G>
      ) : (
        <G>
          <Path d="M20 4 C26 12 30 17 30 24 A10 10 0 0 1 10 24 C10 19 13 16 15 12 C16 16 18 17 19 17 C18 12 18 8 20 4 Z" fill={color} />
          <Path d="M20 17 C23 21 25 23 25 26 A5 5 0 0 1 15 26 C15 23 17 21 20 17 Z" fill={accent} />
          <Path d="M8 36 H32" stroke={color} strokeOpacity={0.5} strokeWidth={1.2} strokeLinecap="round" />
        </G>
      )}
    </Svg>
  );
}
