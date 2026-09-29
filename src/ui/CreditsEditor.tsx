import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';
import { C, F, ROLES, roleLabel } from '../theme';
import { Txt } from './Txt';
import { Chip, IconBtn, row } from './kit';
import { ArtistPicker } from './fields';
import { Avatar } from './Media';
import { tr } from '../i18n';

export interface DraftCredit { artistId?: string; name: string; role: string; instrument?: string | null; photo?: string | null }

export function CreditsEditor({ value, onChange, artists, defaultRole = 'vocalist', roles }: {
  value: DraftCredit[]; onChange: (v: DraftCredit[]) => void; artists: any[]; defaultRole?: string; roles?: string[];
}) {
  const [role, setRole] = useState(defaultRole);
  const roleList = ROLES.filter((r) => !roles || roles.includes(r.key));
  return (
    <View>
      {value.map((c, i) => (
        <Animated.View key={`${c.artistId ?? c.name}-${c.role}-${i}`} entering={FadeIn} exiting={FadeOut} layout={LinearTransition} style={[row, styles.item]}>
          <Avatar uri={c.photo} name={c.name} size={34} />
          <View style={{ flex: 1, marginRight: 10 }}>
            <Txt v="small" color={C.text}>{c.name}</Txt>
            <View style={[row, { gap: 6 }]}>
              <Txt v="caption">{roleLabel(c.role)}</Txt>
              {c.role === 'performer' ? (
                <TextInput
                  value={c.instrument ?? ''}
                  onChangeText={(t) => onChange(value.map((x, j) => (j === i ? { ...x, instrument: t } : x)))}
                  placeholder={tr("ساز (مثلاً تار)")}
                  placeholderTextColor={C.faint}
                  style={styles.inst}
                />
              ) : null}
            </View>
          </View>
          <IconBtn name="x" size={15} color={C.faint} onPress={() => onChange(value.filter((_, j) => j !== i))} style={{ width: 32, height: 32 }} />
        </Animated.View>
      ))}
      <View style={[row, { flexWrap: 'wrap', gap: 6, marginTop: 8, marginBottom: 10 }]}>
        {roleList.map((r) => <Chip key={r.key} label={r.label} active={role === r.key} onPress={() => setRole(r.key)} />)}
      </View>
      <ArtistPicker
        artists={artists}
        placeholder={tr(`افزودن ${roleLabel(role)}…`)}
        onPick={(a) => onChange([...value, { artistId: a.id, name: a.name, role, photo: (a as any).photo ?? null }])}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  item: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line },
  inst: { color: C.accent, fontFamily: F.regular, fontSize: 11.5, paddingVertical: 0, minWidth: 90, textAlign: 'right' },
});
