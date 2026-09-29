import React, { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Field, FormSection } from '@/src/ui/fields';
import { EditorShell } from '@/src/ui/EditorShell';
import { useData } from '@/src/hooks/useData';
import { addTimeline, getArtist } from '@/src/db/repo';
import { tr } from '@/src/i18n';

export default function EditTimeline() {
  const { artistId } = useLocalSearchParams<{ artistId: string }>();
  const me = useData(() => getArtist(artistId), [artistId]);
  const [date, setDate] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await addTimeline({ artistId, date: date.trim() || null, title: title.trim(), description: desc.trim() || null });
      router.back();
    } finally { setSaving(false); }
  };
  return (
    <EditorShell title="رویداد تازه" subtitle={me.data?.name} loading={me.loading} saving={saving} canSave={!!title.trim()} onSave={save}>
      <FormSection title="رویداد">
        <Field label="تاریخ" value={date} onChangeText={setDate} placeholder={tr("۱۳۲۱ یا 1804")} />
        <Field label="عنوان" value={title} onChangeText={setTitle} placeholder={tr("نخستین اجرا در رادیو")} />
        <Field label="شرح" value={desc} onChangeText={setDesc} multiline />
      </FormSection>
    </EditorShell>
  );
}
