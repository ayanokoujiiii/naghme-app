import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { C } from '../theme';

/**
 * «گره‌زدن فرش»: the progress of the track is a strip of carpet being woven.
 * Each column of knots is one row on the loom; as the music advances the weaver
 * ties the next knots, bottom to top, column after column, and a real carpet
 * pattern (border, then a medallion field of diamonds) appears. Fringes (ریشه)
 * hang at both ends. Time runs left to right.
 */
const K = 5; // knot size
const ROWS = 5;
const RED = '#9E3B35';
const CREAM = '#E8DCC4';
const NAVY = '#3E4A6B';

function knotColor(col: number, row: number): string {
  if (row === 0 || row === ROWS - 1) return col % 2 ? C.zarDeep : C.zar; // حاشیه
  const d = Math.abs(((col + 4) % 8) - 4) + Math.abs(row - 2); // lozenge field
  if (d === 0) return CREAM;
  if (d === 1) return C.zar;
  if (d === 2) return RED;
  if (d === 3) return NAVY;
  return RED;
}

export function CarpetProgress({ progress, height }: { progress: number; height?: number }) {
  const [w, setW] = useState(0);
  const cols = Math.max(1, Math.floor((w - 16) / K));
  const total = cols * ROWS;
  const tied = Math.min(total, Math.floor(Math.max(0, Math.min(1, progress)) * total));
  const H = height ?? ROWS * K + 2;

  const knots = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let i = 0; i < tied; i++) {
      const col = Math.floor(i / ROWS);
      const row = ROWS - 1 - (i % ROWS); // bottom to top
      out.push(<Rect key={i} x={8 + col * K + 0.4} y={1 + row * K + 0.4} width={K - 0.8} height={K - 0.8} rx={1.2} fill={knotColor(col, row)} />);
    }
    return out;
  }, [tied, cols]);

  // The warp threads (تار) waiting to be knotted.
  const warp = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let c = Math.floor(tied / ROWS); c < cols; c += 1) {
      const x = 8 + c * K + K / 2;
      out.push(<Line key={c} x1={x} y1={1} x2={x} y2={1 + ROWS * K} stroke={C.text} strokeOpacity={0.1} strokeWidth={0.6} />);
    }
    return out;
  }, [tied, cols]);

  const fringe = useMemo(() => {
    const out: React.ReactElement[] = [];
    for (let r = 0; r < ROWS * 2; r++) {
      const y = 1.5 + r * (K / 2);
      out.push(<Line key={`l${r}`} x1={1} y1={y} x2={7} y2={y} stroke={CREAM} strokeOpacity={0.45} strokeWidth={0.6} />);
      out.push(<Line key={`r${r}`} x1={w - 7} y1={y} x2={w - 1} y2={y} stroke={CREAM} strokeOpacity={0.45} strokeWidth={0.6} />);
    }
    return out;
  }, [w]);

  // The knot being tied right now glows softly.
  const glow = useSharedValue(0);
  useEffect(() => {
    glow.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const g = useAnimatedStyle(() => ({ opacity: 0.25 + glow.value * 0.75 }));
  const nextCol = Math.floor(tied / ROWS);
  const nextRow = ROWS - 1 - (tied % ROWS);

  return (
    <View style={{ height: H, marginTop: 6 }} onLayout={(e) => setW(e.nativeEvent.layout.width)} pointerEvents="none">
      {w ? (
        <>
          <Svg width={w} height={H}>
            {fringe}
            {warp}
            {knots}
          </Svg>
          {tied < total ? (
            <Animated.View
              style={[
                { position: 'absolute', left: 8 + nextCol * K, top: 1 + nextRow * K, width: K, height: K, borderRadius: 1.5, backgroundColor: knotColor(nextCol, nextRow) },
                g,
              ]}
            />
          ) : null}
        </>
      ) : null}
    </View>
  );
}
