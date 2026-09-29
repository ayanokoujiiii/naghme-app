import React, { useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C, RELATION_KINDS } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, row } from '@/src/ui/kit';
import { ArtistPicker, ChoiceRow, Field, FormSection } from '@/src/ui/fields';
import { Avatar } from '@/src/ui/Media';
import { EditorShell } from '@/src/ui/EditorShell';
import { useData } from '@/src/hooks/useData';
import { addRelation, findOrCreateArtist, getArtist, listArtists } from '@/src/db/repo';
import { tr } from '@/src/i18n';

export default function EditRelation() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const me = useData(() => getArtist(artistId), [artistId]);
  const artists = useData(listArtists, []);
  const [other, setOther] = useState<{ id?: string; name: string } | null>(null);
  const [kind, setKind] = useState<string>('teacher');
  const [reverse, setReverse] = useState(false);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const k = RELATION_KINDS.find((x) => x.key === kind)!;
  const symmetric = k.label === k.reverse;
  const otherPhoto = artists.data?.find((a) => a.id === other?.id)?.photo;

  const save = async () => {
    if (!other) return;
    setSaving(true);
    try {
      const oid = other.id ?? (await findOrCreateArtist(other.name, me.data?.tradition));
      if (reverse && !symmetric) await addRelation(oid, artistId, kind, note.trim() || undefined);
      else await addRelation(artistId, oid, kind, note.trim() || undefined);
      router.back();
    } finally { setSaving(false); }
  };

  const sentence = other && me.data
    ? (reverse && !symmetric ? `${other.name} ${k.label} ${me.data.name}` : `${me.data.name} ${k.label} ${other.name}`)
    : null;

  return (
    <EditorShell title="پیوند تازه" subtitle={me.data?.name} loading={me.loading} saving={saving} canSave={!!other} onSave={save}>
      <FormSection title="با چه کسی؟">
        {other ? (
          <View style={[row, { justifyContent: 'space-between' }]}>
            <View style={row}>
              <Avatar uri={otherPhoto} name={other.name} size={40} />
              <Txt v="h3" style={{ marginRight: 10 }}>{other.name}</Txt>
            </View>
            <Chip label="تغییر" icon="x" onPress={() => setOther(null)} />
          </View>
        ) : (
          <ArtistPicker artists={artists.data ?? []} onPick={setOther} exclude={[artistId]} />
        )}
      </FormSection>
      <FormSection title="چه پیوندی؟">
        <ChoiceRow label="نوع" options={RELATION_KINDS.map((x) => ({ key: x.key, label: x.label }))} value={kind} onChange={(v) => setKind(v ?? 'teacher')} allowNone={false} />
        {!symmetric ? (
          <ChoiceRow label="جهت" options={[{ key: 'out', label: `${me.data?.name ?? 'این هنرمند'} ${k.label}…` }, { key: 'in', label: `${me.data?.name ?? 'این هنرمند'} ${k.reverse}…` }]} value={reverse ? 'in' : 'out'} onChange={(v) => setReverse(v === 'in')} allowNone={false} />
        ) : null}
        <Field label="توضیح (اختیاری)" value={note} onChangeText={setNote} placeholder={tr("مثلاً همکاری در برنامهٔ گل‌ها")} />
        {sentence ? <Txt v="small" color={C.accent} center>{sentence}</Txt> : null}
      </FormSection>
      <Txt v="caption" center>هر پیوند یک رشتهٔ نور در کهکشان می‌شود.</Txt>
    </EditorShell>
  );
}
