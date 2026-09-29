import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C } from '../theme';
import { boteh, carpetBand, doily, DoilyLayers, laceEdge, laceNet, rosette, toranj } from './geometry';

interface LayerProps {
  color?: string;
  opacity?: number;
  weight?: number;
  fill?: number;
}

function Layers({ L, color = C.zar, opacity = 1, weight = 1, fill = 0.22 }: LayerProps & { L: DoilyLayers }) {
  return (
    <>
      <Path d={L.thread} fill="none" stroke={color} strokeWidth={weight} strokeOpacity={0.85 * opacity} strokeLinecap="round" />
      <Path d={L.body} fill={color} fillOpacity={fill * opacity} stroke={color} strokeWidth={weight} strokeOpacity={opacity} />
      <Path d={L.eyelets} fill="none" stroke={color} strokeWidth={weight * 0.8} strokeOpacity={0.8 * opacity} />
    </>
  );
}

type Common = LayerProps & { style?: StyleProp<ViewStyle> };

/** Round crochet doily. Every seed gives a slightly different pattern. */
export function Doily({ size, seed = 'naghme', style, ...p }: Common & { size: number; seed?: string }) {
  const L = useMemo(() => doily(size / 2, seed), [size, seed]);
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Layers L={L} weight={Math.max(0.6, size / 320)} {...p} />
    </Svg>
  );
}

/** Scalloped lace hem. Flip it to hang upwards. */
export function LaceEdge({ width, height = 22, flip, style, ...p }: Common & { width: number; height?: number; flip?: boolean }) {
  const L = useMemo(() => laceEdge(width, height), [width, height]);
  return (
    <Svg width={width} height={height * 1.1} style={[flip ? { transform: [{ scaleY: -1 }] } : null, style]} pointerEvents="none">
      <Layers L={L} weight={0.9} {...p} />
    </Svg>
  );
}

export function LaceNet({ width, height, cell = 26, style, ...p }: Common & { width: number; height: number; cell?: number }) {
  const L = useMemo(() => laceNet(width, height, cell), [width, height, cell]);
  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Layers L={L} weight={0.7} fill={0.35} {...p} />
    </Svg>
  );
}

/** Persepolis lotus rosette. */
export function Rosette({ size, petals = 12, style, ...p }: Common & { size: number; petals?: number }) {
  const L = useMemo(() => rosette(size / 2, petals), [size, petals]);
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Layers L={L} weight={Math.max(0.7, size / 200)} {...p} />
    </Svg>
  );
}

export function CarpetBand({ width, height = 18, style, ...p }: Common & { width: number; height?: number }) {
  const L = useMemo(() => carpetBand(width, height), [width, height]);
  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Layers L={L} weight={0.9} {...p} />
    </Svg>
  );
}

export function Toranj({ width, height, style, ...p }: Common & { width: number; height: number }) {
  const L = useMemo(() => toranj(width, height), [width, height]);
  return (
    <Svg width={width} height={height} style={style} pointerEvents="none">
      <Layers L={L} weight={1} {...p} />
    </Svg>
  );
}

export function Boteh({ size, style, ...p }: Common & { size: number }) {
  const L = useMemo(() => boteh(size), [size]);
  return (
    <Svg width={size} height={size} style={style} pointerEvents="none">
      <Layers L={L} weight={1} {...p} />
    </Svg>
  );
}

/** A thin centred divider: line, boteh, line. */
export function OrnamentDivider({ width, style }: { width: number; style?: StyleProp<ViewStyle> }) {
  const s = 16;
  const side = (width - s - 16) / 2;
  const d = `M0 ${s / 2}H${side}M${side + s + 16} ${s / 2}H${width}`;
  const L = useMemo(() => boteh(s), []);
  return (
    <Svg width={width} height={s} style={style} pointerEvents="none">
      <Path d={d} stroke={C.zar} strokeOpacity={0.35} strokeWidth={0.8} />
      <Path d={L.thread} transform={`translate(${side + 8} 0)`} fill="none" stroke={C.zar} strokeOpacity={0.8} strokeWidth={0.9} />
      <Path d={L.body} transform={`translate(${side + 8} 0)`} fill={C.zar} fillOpacity={0.3} />
    </Svg>
  );
}
