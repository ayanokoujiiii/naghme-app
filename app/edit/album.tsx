import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C } from '@/src/theme';
import { Chip, row } from '@/src/ui/kit';
import { Field, FormSection, ImageField } from '@/src/ui/fields';
import { CreditsEditor, DraftCredit } from '@/src/ui/CreditsEditor';
import { EditorShell } from '@/src/ui/EditorShell';
import { useData } from '@/src/hooks/useData';
import { Album, commitCredits, deleteAlbum, getAlbum, listArtists, loadDraftCredits, saveAlbum } from '@/src/db/repo';
import { unravel } from '@/src/ui/Unravel';

export default function EditAlbum() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artists = useData(listArtists, []);
  const [al, setAl] = useState<Partial<Album>>({});
  const [credits, setCredits] = useState<DraftCredit[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<Album>) => setAl((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!id) return;
    (async () => {
      const x = await getAlbum(id);
      if (x) { setAl(x); setCredits(await loadDraftCredits({ albumId: id })); }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!al.title?.trim()) return;
    setSaving(true);
    try {
      const aid = await saveAlbum({ ...al, title: al.title });
      await commitCredits({ albumId: aid }, credits);
      if (id) router.back(); else router.replace({ pathname: '/album/[id]', params: { id: aid } });
    } finally { setSaving(false); }
  };

  return (
    <EditorShell title={id ? 'ویرایش آلبوم' : 'آلبوم تازه'} subtitle={al.title || undefined} loading={loading} saving={saving} canSave={!!al.title?.trim()} onSave={save}>
      <FormSection title="آلبوم">
        <ImageField label="جلد" value={al.cover} onChange={(v) => set({ cover: v })} />
        <Field label="نام آلبوم" value={al.title ?? ''} onChangeText={(t) => set({ title: t })} />
        <View style={[row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Field label="سال انتشار" value={al.year ?? ''} onChangeText={(t) => set({ year: t })} /></View>
          <View style={{ flex: 1 }}><Field label="ناشر" value={al.label ?? ''} onChangeText={(t) => set({ label: t })} /></View>
        </View>
        <Field label="یادداشت" value={al.notes ?? ''} onChangeText={(t) => set({ notes: t })} multiline />
      </FormSection>
      <FormSection title="هنرمندان آلبوم">
        <CreditsEditor value={credits} onChange={setCredits} artists={artists.data ?? []} defaultRole="vocalist" />
      </FormSection>
      {id ? (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Chip label="حذف آلبوم" icon="trash-2" color={C.danger} onPress={() => Alert.alert('حذف آلبوم', 'آلبوم حذف شود؟ قطعه‌ها باقی می‌مانند.', [
            { text: 'انصراف' },
            { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteAlbum(id); router.dismissTo('/archive'); }) },
          ])} />
        </View>
      ) : null}
    </EditorShell>
  );
}
