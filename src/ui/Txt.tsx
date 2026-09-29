import React from 'react';
import { Text, TextProps, TextStyle } from 'react-native';
import { C, F } from '../theme';
import { trChildren, useLang } from '../i18n';

type Variant = 'display' | 'title' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'latin';

const V: Record<Variant, TextStyle> = {
  display: { fontFamily: F.light, fontSize: 38, lineHeight: 54, letterSpacing: -0.5 },
  title: { fontFamily: F.medium, fontSize: 24, lineHeight: 38 },
  h2: { fontFamily: F.medium, fontSize: 18, lineHeight: 30 },
  h3: { fontFamily: F.medium, fontSize: 15, lineHeight: 25 },
  body: { fontFamily: F.regular, fontSize: 14.5, lineHeight: 27 },
  small: { fontFamily: F.regular, fontSize: 12.5, lineHeight: 21 },
  caption: { fontFamily: F.regular, fontSize: 11, lineHeight: 18, letterSpacing: 0.2 },
  label: { fontFamily: F.medium, fontSize: 11.5, lineHeight: 18, letterSpacing: 0.6 },
  latin: { fontFamily: F.light, fontSize: 12.5, lineHeight: 19, letterSpacing: 0.4 },
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
