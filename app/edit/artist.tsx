import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C, TRADITIONS } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Chip, row } from '@/src/ui/kit';
import { ChoiceRow, Field, FormSection, GalleryField, ImageField } from '@/src/ui/fields';
import { EditorShell } from '@/src/ui/EditorShell';
import { Artist, deleteArtist, galleryOf, getArtist, saveArtist } from '@/src/db/repo';
import { fetchArtistSummary, fetchLifeSpan } from '@/src/services/wiki';
import { downloadImage } from '@/src/services/files';
import { unravel } from '@/src/ui/Unravel';
import { tr } from '@/src/i18n';

const KINDS = [{ key: 'person', label: 'فرد' }, { key: 'ensemble', label: 'گروه / ارکستر' }];

export default function EditArtist() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [a, setA] = useState<Partial<Artist>>({ tradition: 'persian', kind: 'person' });
  const [gallery, setGallery] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const [fetching, setFetching] = useState(false);
  const set = (patch: Partial<Artist>) => setA((x) => ({ ...x, ...patch }));

  useEffect(() => {
    if (!id) return;
    getArtist(id).then((x) => { if (x) { setA(x); setGallery(galleryOf(x)); } setLoading(false); });
  }, [id]);

  const enrich = async () => {
    if (!a.name?.trim()) return Alert.alert('اول نام هنرمند را بنویس.');
    setFetching(true);
    try {
      const [s, life] = await Promise.all([fetchArtistSummary(a.name, a.nameLatin), fetchLifeSpan(a.nameLatin || a.name)]);
      if (!s && !life) { Alert.alert('چیزی پیدا نشد', 'اینترنت را بررسی کن یا نام لاتین را هم بنویس.'); return; }
      const patch: Partial<Artist> = {};
      if (s?.extract && (!a.bio || a.bio.length < 40)) patch.bio = s.extract;
      if (s?.url) patch.source = s.url;
      if (life?.born && !a.born) patch.born = life.born;
      if (life?.died && !a.died) patch.died = life.died;
      if (s?.image) {
        const img = await downloadImage(s.image);
        if (img) { if (!a.photo) patch.photo = img; else setGallery((g) => [...g, img]); }
      }
      set(patch);
      Alert.alert('کامل شد', s ? `از ویکی‌پدیای ${s.lang === 'fa' ? 'فارسی' : 'انگلیسی'} گرفته شد. متن را مرور کن.` : 'سال‌ها از MusicBrainz گرفته شد.');
    } finally {
      setFetching(false);
    }
  };

  const save = async () => {
    if (!a.name?.trim()) return;
    setSaving(true);
    try {
      const newId = await saveArtist({ ...a, name: a.name, gallery: JSON.stringify(gallery) });
      if (id) router.back(); else router.replace({ pathname: '/artist/[id]', params: { id: newId } });
    } finally { setSaving(false); }
  };

  return (
    <EditorShell title={id ? 'ویرایش هنرمند' : 'هنرمند تازه'} subtitle={a.name || undefined} loading={loading} saving={saving} canSave={!!a.name?.trim()} onSave={save}>
      <FormSection title="هویت">
        <Field label="نام" value={a.name ?? ''} onChangeText={(t) => set({ name: t })} placeholder={tr("مثلاً غلامحسین بنان")} />
        <Field label="نام لاتین" value={a.nameLatin ?? ''} onChangeText={(t) => set({ nameLatin: t })} ltr placeholder="Gholam-Hossein Banan" autoCapitalize="words" />
        <ChoiceRow label="گونه" options={TRADITIONS} value={a.tradition} onChange={(v) => set({ tradition: v ?? 'persian' })} allowNone={false} />
        <ChoiceRow label="نوع" options={KINDS} value={a.kind} onChange={(v) => set({ kind: v ?? 'person' })} allowNone={false} />
        <View style={[row, { gap: 10 }]}>
          <View style={{ flex: 1 }}><Field label="تولد" value={a.born ?? ''} onChangeText={(t) => set({ born: t })} placeholder={tr("۱۲۹۰")} /></View>
          <View style={{ flex: 1 }}><Field label="درگذشت" value={a.died ?? ''} onChangeText={(t) => set({ died: t })} placeholder={tr("۱۳۶۴")} /></View>
        </View>
        <Field label="ساز / صدا" value={a.instruments ?? ''} onChangeText={(t) => set({ instruments: t })} placeholder={tr("آواز، تار، پیانو…")} />
        <Button label="تکمیل خودکار از ویکی‌پدیا و MusicBrainz" icon="globe" kind="ghost" loading={fetching} onPress={enrich} />
      </FormSection>

      <FormSection title="تصاویر">
        <ImageField label="عکس پروفایل" value={a.photo} onChange={(v) => set({ photo: v })} round />
        <ImageField label="تصویر زمینه" value={a.cover} onChange={(v) => set({ cover: v })} wide />
        <GalleryField label="نگارخانه" value={gallery} onChange={setGallery} />
      </FormSection>

      <FormSection title="زندگی‌نامه">
        <Field label="زندگی‌نامه" value={a.bio ?? ''} onChangeText={(t) => set({ bio: t })} multiline placeholder={tr("چند خط از زندگی و هنرش…")} />
        <Field label="منبع" value={a.source ?? ''} onChangeText={(t) => set({ source: t })} ltr autoCapitalize="none" placeholder="https://…" />
      </FormSection>

      {id ? (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Chip label="حذف هنرمند" icon="trash-2" color={C.danger} onPress={() => Alert.alert('حذف هنرمند', 'هنرمند و پیوندهایش حذف شود؟ آثار و قطعه‌ها می‌مانند.', [
            { text: 'انصراف' },
            { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteArtist(id); router.dismissTo('/archive'); }) },
          ])} />
          <Txt v="caption" style={{ marginTop: 6 }}>پیوندها و گاه‌شمار را از صفحهٔ هنرمند اضافه کن.</Txt>
        </View>
      ) : null}
    </EditorShell>
  );
}
