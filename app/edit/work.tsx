import React, { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { C, CLASSICAL_FORMS, PERSIAN_FORMS, TRADITIONS } from '@/src/theme';
import { avazesOf, DASTGAH_LIST, gushesOf, normalizeAvaz, parentOf } from '@/src/radif';
import { Txt } from '@/src/ui/Txt';
import { Chip, row } from '@/src/ui/kit';
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
            <RadifPicker
              dastgah={w.dastgah ?? parentOf(w.avaz)}
              avaz={normalizeAvaz(w.avaz)}
              gousheh={w.gousheh ?? ''}
              onChange={(p) => set(p)}
            />
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

/**
 * v1.1: dastgah → avaz → gushe as a tree. Choosing a dastgah shows only its own
 * avazes; the gushe chips come from the chosen avaz (or the dastgah itself).
 * Several gushes can be chosen, and any other name can still be typed.
 */
function RadifPicker({ dastgah, avaz, gousheh, onChange }: {
  dastgah: string | null; avaz: string | null; gousheh: string;
  onChange: (p: { dastgah?: string | null; avaz?: string | null; gousheh?: string | null }) => void;
}) {
  const avazes = avazesOf(dastgah);
  const gushes = gushesOf(dastgah, avaz);
  const chosen = gousheh.split(/[،,]/).map((x) => x.trim()).filter(Boolean);
  const toggleGushe = (g: string) => {
    const next = chosen.includes(g) ? chosen.filter((x) => x !== g) : [...chosen, g];
    onChange({ gousheh: next.join('، ') || null });
  };
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.zarBright} style={{ marginBottom: 8 }}>دستگاه</Txt>
      <View style={[row, { flexWrap: 'wrap', gap: 8 }]}>
        {DASTGAH_LIST.map((d) => (
          <Chip key={d} label={d} color={C.persian} active={dastgah === d}
            onPress={() => onChange(dastgah === d ? { dastgah: null, avaz: null, gousheh: null } : { dastgah: d, avaz: null, gousheh: null })} />
        ))}
      </View>
      {avazes.length ? (
        <>
          <Txt v="label" color={C.zarBright} style={{ marginTop: 16, marginBottom: 8 }}>{`آوازهای ${dastgah} (اختیاری)`}</Txt>
          <View style={[row, { flexWrap: 'wrap', gap: 8 }]}>
            {avazes.map((a) => (
              <Chip key={a} label={a} color={C.narenj} active={avaz === a} onPress={() => onChange({ avaz: avaz === a ? null : a, dastgah, gousheh: null })} />
            ))}
          </View>
        </>
      ) : null}
      {gushes.length ? (
        <>
          <Txt v="label" color={C.zarBright} style={{ marginTop: 16, marginBottom: 8 }}>{`گوشه‌های ${avaz || dastgah}`}</Txt>
          <View style={[row, { flexWrap: 'wrap', gap: 8 }]}>
            {gushes.map((g) => <Chip key={g} label={g} color={C.firouzeh} active={chosen.includes(g)} onPress={() => toggleGushe(g)} />)}
          </View>
        </>
      ) : (
        <Txt v="caption" style={{ marginTop: 10 }}>اول دستگاه را انتخاب کن تا گوشه‌هایش بیاید.</Txt>
      )}
      <View style={{ marginTop: 14 }}>
        <Field label="گوشه‌ها (یا نام دیگر)" value={gousheh} onChangeText={(t) => onChange({ gousheh: t || null })} placeholder={tr('مثلاً درآمد، کرشمه')} />
      </View>
      <Txt v="caption" color={C.faint}>گوشه‌ها بر پایهٔ ردیف میرزاعبدالله‌اند؛ در ردیف‌های دیگر نام و ترتیب کمی فرق دارد.</Txt>
    </View>
  );
}
