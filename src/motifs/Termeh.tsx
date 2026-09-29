import React, { useMemo, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Defs, G, Path, Pattern, Rect } from 'react-native-svg';
import { C } from '../theme';
import { boteh } from './geometry';

let seq = 0;

/**
 * «بافت ترمه»: the woven cloth of Yazd behind every card. Staggered rows of
 * بته‌جقه, each row facing the other way, over fine silk stripes. Kept very
 * faint so it is felt more than seen.
 */
export function Termeh({ color = C.zar, opacity = 0.09 }: { color?: string; opacity?: number }) {
  const id = useRef(`termeh${++seq}`).current;
  const L = useMemo(() => boteh(13), []);
  return (
    <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" pointerEvents="none">
      <Defs>
        <Pattern id={id} patternUnits="userSpaceOnUse" width={30} height={34}>
          <Rect x={0} y={0} width={0.5} height={34} fill={color} fillOpacity={opacity * 0.9} />
          <Rect x={15} y={0} width={0.35} height={34} fill={color} fillOpacity={opacity * 0.6} />
          <G transform="translate(2 2)">
            <Path d={L.thread} fill="none" stroke={color} strokeOpacity={opacity * 1.6} strokeWidth={0.6} />
            <Path d={L.body} fill={color} fillOpacity={opacity} />
          </G>
          <G transform="translate(30 19) scale(-1 1)">
            <Path d={L.thread} fill="none" stroke={color} strokeOpacity={opacity * 1.6} strokeWidth={0.6} />
            <Path d={L.body} fill={color} fillOpacity={opacity} />
          </G>
        </Pattern>
      </Defs>
      <Rect x={0} y={0} width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}
