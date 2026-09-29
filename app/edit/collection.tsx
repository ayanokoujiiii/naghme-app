import React, { useEffect, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Field, FormSection, ImageField } from '@/src/ui/fields';
import { EditorShell } from '@/src/ui/EditorShell';
import { Collection, getCollection, saveCollection } from '@/src/db/repo';
import { tr } from '@/src/i18n';

export default function EditCollection() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [c, setC] = useState<Partial<Collection>>({});
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (id) getCollection(id).then((x) => { if (x) setC(x); setLoading(false); }); }, [id]);
  const save = async () => {
    if (!c.title?.trim()) return;
    setSaving(true);
    try {
      const cid = await saveCollection({ ...c, title: c.title });
      if (id) router.back(); else router.replace({ pathname: '/collection/[id]', params: { id: cid } });
    } finally { setSaving(false); }
  };
  return (
    <EditorShell title={id ? 'ویرایش مجموعه' : 'مجموعهٔ تازه'} loading={loading} saving={saving} canSave={!!c.title?.trim()} onSave={save}>
      <FormSection title="مجموعه">
        <ImageField label="جلد" value={c.cover} onChange={(v) => setC((x) => ({ ...x, cover: v }))} />
        <Field label="نام" value={c.title ?? ''} onChangeText={(t) => setC((x) => ({ ...x, title: t }))} placeholder={tr("مثلاً شب‌های همایون")} />
        <Field label="توضیح" value={c.description ?? ''} onChangeText={(t) => setC((x) => ({ ...x, description: t }))} multiline />
      </FormSection>
    </EditorShell>
  );
}
