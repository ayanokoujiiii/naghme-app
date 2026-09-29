import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { AVAZES, C, CLASSICAL_FORMS, DASTGAHS, PERSIAN_FORMS, TRADITIONS } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip } from '@/src/ui/kit';
import { ChoiceRow, Field, FormSection, GalleryField, ImageField } from '@/src/ui/fields';
import { CreditsEditor, DraftCredit } from '@/src/ui/CreditsEditor';
import { EditorShell } from '@/src/ui/EditorShell';
import { useData } from '@/src/hooks/useData';
import { commitCredits, deleteWork, getWork, listArtists, loadDraftCredits, saveWork, Work } from '@/src/db/repo';
import { parseList } from '@/src/utils';
import { unravel } from '@/src/ui/Unravel';
import { tr } from '@/src/i18n';

export default function EditWork() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const artists = useData(listArtists, []);
  const [w, setW] = useState<Partial<Work>>({ tradition: 'persian' });
  const [sheets, setSheets] = useState<string[]>([]);
  const [credits, setCredits] = useState<DraftCredit[]>([]);
  const [loading, setLoading] = useState(!!id);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<Work>) => setW((x) => ({ ...x, ...p }));
  const persian = w.tradition === 'persian';

  useEffect(() => {
    if (!id) return;
    (async () => {
      const x = await getWork(id);
      if (x) { setW(x); setSheets(parseList(x.sheetImages)); setCredits(await loadDraftCredits({ workId: id })); }
      setLoading(false);
    })();
  }, [id]);

  const save = async () => {
    if (!w.title?.trim()) return;
    setSaving(true);
    try {
      const wid = await saveWork({ ...w, title: w.title, sheetImages: JSON.stringify(sheets) });
      await commitCredits({ workId: wid }, credits, w.tradition || 'persian');
      if (id) router.back(); else router.replace({ pathname: '/work/[id]', params: { id: wid } });
    } finally { setSaving(false); }
  };

  return (
    <EditorShell title={id ? 'ویرایش اثر' : 'اثر تازه'} subtitle={w.title || undefined} loading={loading} saving={saving} canSave={!!w.title?.trim()} onSave={save}>
      <FormSection title="اثر">
        <Field label="نام اثر" value={w.title ?? ''} onChangeText={(t) => set({ title: t })} placeholder={tr(persian ? 'مثلاً مرغ سحر' : 'مثلاً سونات مهتاب')} />
        <Field label="نام لاتین / اصلی" value={w.titleLatin ?? ''} onChangeText={(t) => set({ titleLatin: t })} ltr placeholder="Moonlight Sonata" />
        <ChoiceRow label="گونه" options={TRADITIONS} value={w.tradition} onChange={(v) => set({ tradition: v ?? 'persian' })} allowNone={false} />
        <ChoiceRow label="فرم" options={persian ? PERSIAN_FORMS : CLASSICAL_FORMS} value={w.form} onChange={(v) => set({ form: v })} />
        {persian ? (
          <>
            <ChoiceRow label="دستگاه" options={DASTGAHS} value={w.dastgah} onChange={(v) => set({ dastgah: v, avaz: v ? null : w.avaz })} />
            <ChoiceRow label="یا آواز" options={AVAZES} value={w.avaz} onChange={(v) => set({ avaz: v, dastgah: v ? null : w.dastgah })} />
            <Field label="گوشه" value={w.gousheh ?? ''} onChangeText={(t) => set({ gousheh: t })} placeholder={tr("درآمد، شکسته، بیداد…")} />
          </>
        ) : (
          <Field label="شمارهٔ کاتالوگ / اپوس" value={w.catalog ?? ''} onChangeText={(t) => set({ catalog: t })} ltr placeholder="Op. 27 No. 2 · K. 525 · BWV 1007" />
        )}
        <Field label="سال ساخت" value={w.year ?? ''} onChangeText={(t) => set({ year: t })} placeholder={tr("۱۳۰۶ یا 1801")} />
      </FormSection>

      <FormSection title="سازندگان">
        <CreditsEditor value={credits} onChange={setCredits} artists={artists.data ?? []} defaultRole="composer" roles={['composer', 'lyricist', 'arranger']} />
      </FormSection>

      <FormSection title="پوستر و متن">
        <ImageField label="پوستر" value={w.poster} onChange={(v) => set({ poster: v })} />
        <Field label={persian ? 'شعر / ترانه' : 'متن (اگر آوازی است)'} value={w.lyrics ?? ''} onChangeText={(t) => set({ lyrics: t })} multiline placeholder={tr("هر مصرع در یک خط…")} />
        <Field label="دربارهٔ اثر" value={w.description ?? ''} onChangeText={(t) => set({ description: t })} multiline placeholder={tr("داستان ساخت، حال‌وهوا، نکته‌ها…")} />
      </FormSection>

      <FormSection title="نت">
        <GalleryField label="تصویر نت‌ها" value={sheets} onChange={setSheets} />
        <Field label="نت نوشتاری" value={w.sheetText ?? ''} onChangeText={(t) => set({ sheetText: t })} multiline ltr placeholder={tr("مثلاً: سل لا سی دو | ر … یا نت‌نویسی متنی")} />
      </FormSection>

      {id ? (
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Chip label="حذف اثر" icon="trash-2" color={C.danger} onPress={() => Alert.alert('حذف اثر', 'اثر حذف شود؟ اجراها باقی می‌مانند.', [
            { text: 'انصراف' },
            { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteWork(id); router.dismissTo('/archive'); }) },
          ])} />
        </View>
      ) : <Txt v="caption" center>بعد از ذخیره می‌توانی اجراها را از منوی هر قطعه به این اثر وصل کنی.</Txt>}
    </EditorShell>
  );
}
