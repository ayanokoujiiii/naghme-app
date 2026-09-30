import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { C, F, R } from '../theme';
import { persistImage } from '../services/files';
import { matches } from '../utils';
import { Txt } from './Txt';
import { Chip, Pressy, row } from './kit';
import { Avatar, Cover } from './Media';
import { tr } from '../i18n';

export function Field({ label, hint, style, multiline, ltr, ...rest }: TextInputProps & { label: string; hint?: string; ltr?: boolean }) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
      <TextInput
        {...rest}
        multiline={multiline}
        placeholderTextColor={C.faint}
        onFocus={(e) => { setFocus(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocus(false); rest.onBlur?.(e); }}
        style={[
          styles.input,
          multiline && { minHeight: 110, textAlignVertical: 'top', paddingTop: 12, lineHeight: 26 },
          { textAlign: ltr ? 'left' : 'right', writingDirection: ltr ? 'ltr' : 'rtl' },
          focus && { borderColor: C.accent + '88' },
          style,
        ]}
      />
      {hint ? <Txt v="caption" style={{ marginTop: 6 }}>{hint}</Txt> : null}
    </View>
  );
}

export function ChoiceRow({ label, options, value, onChange, color, allowNone = true }: {
  label: string; options: { key: string; label: string }[] | string[]; value: string | null | undefined; onChange: (v: string | null) => void; color?: string; allowNone?: boolean;
}) {
  const opts = (options as any[]).map((o) => (typeof o === 'string' ? { key: o, label: o } : o));
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
      <View style={[row, { flexWrap: 'wrap', gap: 8 }]}>
        {opts.map((o) => (
          <Chip key={o.key} label={o.label} color={color} active={value === o.key} onPress={() => onChange(value === o.key && allowNone ? null : o.key)} />
        ))}
      </View>
    </View>
  );
}

async function pickImages(multiple: boolean): Promise<string[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: multiple,
    quality: 0.9,
    selectionLimit: multiple ? 20 : 1,
  });
  if (res.canceled) return [];
  return res.assets.map((a) => persistImage(a.uri));
}

export function ImageField({ label, value, onChange, round, wide }: { label: string; value: string | null | undefined; onChange: (v: string | null) => void; round?: boolean; wide?: boolean }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
      <View style={[row, { gap: 12 }]}>
        <Pressy onPress={async () => { const [u] = await pickImages(false); if (u) onChange(u); }} scaleTo={0.96}>
          {value ? (
            <Cover uri={value} size={wide ? 150 : 96} radius={round ? 48 : 18} style={wide ? { width: 150, height: 96 } : undefined} />
          ) : (
            <View style={[styles.imgEmpty, { width: wide ? 150 : 96, height: 96, borderRadius: round ? 48 : 18 }]}>
              <Feather name="image" size={20} color={C.accent} />
              <Txt v="caption" center style={{ marginTop: 4 }}>انتخاب</Txt>
            </View>
          )}
        </Pressy>
        {value ? <Chip label="حذف" icon="x" onPress={() => onChange(null)} /> : null}
      </View>
    </View>
  );
}

export function GalleryField({ label, value, onChange }: { label: string; value: string[]; onChange: (v: string[]) => void }) {
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ transform: [{ scaleX: -1 }] }} contentContainerStyle={{ gap: 10 }}>
        <View style={{ transform: [{ scaleX: -1 }] }}>
          <Pressy onPress={async () => { const u = await pickImages(true); if (u.length) onChange([...value, ...u]); }} scaleTo={0.95}>
            <View style={[styles.imgEmpty, { width: 84, height: 84, borderRadius: 16 }]}>
              <Feather name="plus" size={20} color={C.accent} />
            </View>
          </Pressy>
        </View>
        {value.map((u, i) => (
          <Animated.View key={u} entering={FadeIn} layout={LinearTransition} style={{ transform: [{ scaleX: -1 }] }}>
            <Pressy onPress={() => router.push({ pathname: '/viewer', params: { images: JSON.stringify(value), index: String(i) } })} onLongPress={() => onChange(value.filter((x) => x !== u))} scaleTo={0.95}>
              <Cover uri={u} size={84} radius={16} />
            </Pressy>
          </Animated.View>
        ))}
      </ScrollView>
      {value.length ? <Txt v="caption" style={{ marginTop: 6 }}>برای حذف، روی عکس نگه دار.</Txt> : null}
    </View>
  );
}

/** Inline search to pick an existing artist or create a new one by name. */
export function ArtistPicker({ artists, onPick, placeholder = 'نام هنرمند…', exclude = [] }: {
  artists: { id: string; name: string; nameLatin?: string | null; photo?: string | null }[];
  onPick: (a: { id?: string; name: string }) => void;
  placeholder?: string;
  exclude?: string[];
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => (q.trim() ? artists.filter((a) => !exclude.includes(a.id) && matches(q, a.name, a.nameLatin)).slice(0, 6) : []), [q, artists, exclude]);
  const exact = artists.some((a) => a.name.trim() === q.trim());
  return (
    <View>
      <View style={[row, styles.input, { paddingHorizontal: 12 }]}>
        <Feather name="user-plus" size={16} color={C.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder={tr(placeholder)} placeholderTextColor={C.faint} style={{ flex: 1, color: C.text, fontFamily: F.regular, fontSize: 15.5, textAlign: 'right', marginRight: 10 }} />
      </View>
      {list.map((a) => (
        <Animated.View key={a.id} entering={FadeInDown.duration(200)}>
          <Pressy onPress={() => { onPick(a); setQ(''); }} style={[row, { paddingVertical: 8, paddingHorizontal: 6 }]} scaleTo={0.98}>
            <Avatar uri={a.photo} name={a.name} size={30} />
            <Txt v="small" color={C.text} style={{ marginRight: 10 }}>{a.name}</Txt>
          </Pressy>
        </Animated.View>
      ))}
      {q.trim() && !exact ? (
        <Pressy onPress={() => { onPick({ name: q.trim() }); setQ(''); }} style={[row, { paddingVertical: 10, paddingHorizontal: 6 }]} scaleTo={0.98}>
          <Feather name="plus-circle" size={18} color={C.accent} />
          <Txt v="small" color={C.accent} style={{ marginRight: 10 }}>{`افزودن «${q.trim()}» به هنرمندان`}</Txt>
        </Pressy>
      ) : null}
    </View>
  );
}

export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Txt v="h3" color={C.accent} style={{ marginBottom: 14 }}>{title}</Txt>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: R.md,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: C.line,
    paddingHorizontal: 14,
    color: C.text,
    fontFamily: F.regular,
    fontSize: 16,
  },
  imgEmpty: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderStyle: 'dashed', borderColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' },
  section: { marginHorizontal: 16, marginBottom: 16, padding: 18, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: StyleSheet.hairlineWidth, borderColor: C.line },
});
