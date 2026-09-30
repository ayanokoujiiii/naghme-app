import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { C, F } from '../theme';
import { trChildren, useLang } from '../i18n';

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'latin';

// v1.1: everything about 12% larger for comfortable reading.
const V: Record<Variant, TextStyle> = {
  display: { fontFamily: F.light, fontSize: 40, lineHeight: 58, letterSpacing: -0.5 },
  title: { fontFamily: F.medium, fontSize: 26, lineHeight: 42 },
  h2: { fontFamily: F.medium, fontSize: 20, lineHeight: 33 },
  h3: { fontFamily: F.medium, fontSize: 16.5, lineHeight: 28 },
  body: { fontFamily: F.regular, fontSize: 16, lineHeight: 30 },
  small: { fontFamily: F.regular, fontSize: 14, lineHeight: 24 },
  caption: { fontFamily: F.regular, fontSize: 12.5, lineHeight: 20, letterSpacing: 0.2 },
  label: { fontFamily: F.bold, fontSize: 13, lineHeight: 21, letterSpacing: 0.4 },
  latin: { fontFamily: F.light, fontSize: 14, lineHeight: 21, letterSpacing: 0.4 },
};

export interface TxtProps extends TextProps {
  v?: Variant;
  color?: string;
  center?: boolean;
  left?: boolean;
}

export function Txt({ v = 'body', color, center, left, style, children, ...rest }: TxtProps) {
  const en = useLang((s) => s.lang === 'en');
  return (
    <Text
      {...rest}
      style={[
        V[v],
        { color: color ?? (v === 'caption' || v === 'small' || v === 'latin' ? C.dim : C.text) },
        { textAlign: center ? 'center' : left ? 'left' : 'right', writingDirection: left || en ? 'ltr' : 'rtl' },
        style,
      ]}
    >
      {en ? trChildren(children) : children}
    </Text>
  );
}
