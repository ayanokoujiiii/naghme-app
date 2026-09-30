import React, { useEffect, useMemo, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C, F } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, Pressy, row } from '@/src/ui/kit';
import { Field, FormSection, ImageField } from '@/src/ui/fields';
import { CreditsEditor, DraftCredit } from '@/src/ui/CreditsEditor';
import { EditorShell } from '@/src/ui/EditorShell';
import { useData } from '@/src/hooks/useData';
import {
  commitCredits, findOrCreateAlbum, findOrCreateWork, getRecording, listAlbums, listArtists, listWorks, loadDraftCredits, Recording, saveRecording,
} from '@/src/db/repo';
import { qualityLabel } from '@/src/audio/formats';
import { matches, toFa } from '@/src/utils';
import { tr } from '@/src/i18n';

type Linked = { id?: string; title: string } | null;

/** Search an existing work/album by title, or create one with the typed name. */
function LinkPicker({ label, icon, items, value, onChange }: {
  label: string; icon: any; items: { id: string; title: string; sub?: string | null }[]; value: Linked; onChange: (v: Linked) => void;
}) {
  const [q, setQ] = useState('');
  const hits = useMemo(() => (q.trim() ? items.filter((x) => matches(q, x.title, x.sub)).slice(0, 6) : []), [q, items]);
  const exact = items.some((x) => x.title.trim() === q.trim());
  if (value) {
    return (
      <View style={{ marginBottom: 18 }}>
        <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
        <View style={[row, { justifyContent: 'space-between' }]}>
          <View style={[row, { flex: 1 }]}>
            <Feather name={icon} size={16} color={C.accent} />
            <Txt v="h3" numberOfLines={1} style={{ marginRight: 10, flex: 1 }}>{value.title}</Txt>
            {!value.id ? <Txt v="caption">تازه</Txt> : null}
          </View>
          <Chip label="برداشتن" icon="x" onPress={() => onChange(null)} />
        </View>
      </View>
    );
  }
  return (
    <View style={{ marginBottom: 18 }}>
      <Txt v="label" color={C.dim} style={{ marginBottom: 8 }}>{label}</Txt>
      <View style={[row, { minHeight: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.045)', borderWidth: 0.5, borderColor: C.line, paddingHorizontal: 12 }]}>
        <Feather name="search" size={15} color={C.faint} />
        <TextInput value={q} onChangeText={setQ} placeholder={tr("جست‌وجو یا نام تازه…")} placeholderTextColor={C.faint} style={{ flex: 1, color: C.text, fontFamily: F.regular, fontSize: 15.5, textAlign: 'right', marginRight: 10 }} />
      </View>
      {hits.map((x) => (
        <Animated.View key={x.id} entering={FadeInDown.duration(200)}>
          <Pressy onPress={() => { onChange({ id: x.id, title: x.title }); setQ(''); }} style={[row, { paddingVertical: 9, paddingHorizontal: 6 }]} scaleTo={0.98}>
            <Feather name={icon} size={14} color={C.dim} />
            <Txt v="small" color={C.text} style={{ marginRight: 10 }}>{x.title}</Txt>
            {x.sub ? <Txt v="caption" style={{ marginRight: 8 }} numberOfLines={1}>{x.sub}</Txt> : null}
          </Pressy>
        </Animated.View>
      ))}
      {q.trim() && !exact ? (
        <Pressy onPress={() => { onChange({ title: q.trim() }); setQ(''); }} style={[row, { paddingVertical: 10, paddingHorizontal: 6 }]} scaleTo={0.98}>
          <Feather name="plus-circle" size={16} color={C.accent} />
          <Txt v="small" color={C.accent} style={{ marginRight: 10 }}>{`ساختن «${q.trim()}»`}</Txt>
        </Pressy>
      ) : null}
    </View>
  );
}

export default function EditRecording() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const artists = useData(listArtists, []);
  const works = useData(listWorks, []);
  const albums = useData(listAlbums, []);
  const [r, setR] = useState<Partial<Recording> | null>(null);
  const [work, setWork] = useState<Linked>(null);
  const [album, setAlbum] = useState<Linked>(null);
  const [credits, setCredits] = useState<DraftCredit[]>([]);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<Recording>) => setR((x) => ({ ...(x ?? {}), ...p }));

  useEffect(() => {
    (async () => {
      const x = await getRecording(id);
      if (!x) { setR({}); return; }
      setR(x);
      setWork(x.workId ? { id: x.workId, title: x.workTitle ?? '' } : null);
      setAlbum(x.albumId ? { id: x.albumId, title: x.albumTitle ?? '' } : null);
      setCredits(await loadDraftCredits({ recordingId: id }));
    })();
  }, [id]);

  const save = async () => {
    if (!r?.title?.trim()) return;
    setSaving(true);
    try {
      const workId = work ? work.id ?? (await findOrCreateWork(work.title)) : null;
      const albumId = album ? album.id ?? (await findOrCreateAlbum(album.title)) : null;
      const num = (v: any) => { const n = parseInt(String(v ?? '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))), 10); return Number.isFinite(n) ? n : null; };
      await saveRecording({ ...r, id, title: r.title, workId, albumId, discNo: num(r.discNo), trackNo: num(r.trackNo) });
      await commitCredits({ recordingId: id }, credits);
      router.back();
    } catch (e: any) {
      Alert.alert('ذخیره نشد', e?.message ?? '');
    } finally { setSaving(false); }
  };

  const hasLrc = /\[\d{1,2}:\d{2}/.test(r?.lyrics ?? '');

  return (
    <EditorShell title="ویرایش قطعه" subtitle={r?.title || undefined} loading={!r} saving={saving} canSave={!!r?.title?.trim()} onSave={save}>
      {r ? (
        <>
          <FormSection title="قطعه">
            <Field label="نام" value={r.title ?? ''} onChangeText={(t) => set({ title: t })} />
            <LinkPicker label="اثر" icon="feather" value={work} onChange={setWork} items={(works.data ?? []).map((w) => ({ id: w.id, title: w.title, sub: w.composers }))} />
            <LinkPicker label="آلبوم" icon="disc" value={album} onChange={setAlbum} items={(albums.data ?? []).map((a) => ({ id: a.id, title: a.title, sub: a.year }))} />
            <View style={[row, { gap: 10 }]}>
              <View style={{ flex: 1 }}><Field label="دیسک" value={r.discNo != null ? String(r.discNo) : ''} onChangeText={(t) => set({ discNo: t as any })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1 }}><Field label="شمارهٔ ترک" value={r.trackNo != null ? String(r.trackNo) : ''} onChangeText={(t) => set({ trackNo: t as any })} keyboardType="number-pad" /></View>
              <View style={{ flex: 1.3 }}><Field label="سال ضبط" value={r.year ?? ''} onChangeText={(t) => set({ year: t })} /></View>
            </View>
            {r.format ? <Txt v="caption">{`${qualityLabel(r as any)}${r.originalName ? ` · ${r.originalName}` : ''}`}</Txt> : <Txt v="caption">هنوز فایل صوتی وصل نشده.</Txt>}
          </FormSection>

          <FormSection title="اجراکنندگان">
            <CreditsEditor value={credits} onChange={setCredits} artists={artists.data ?? []} defaultRole="vocalist" roles={['vocalist', 'performer', 'conductor', 'ensemble', 'arranger', 'other']} />
            <Txt v="caption" style={{ marginTop: 8 }}>آهنگساز و شاعر روی خودِ اثر ثبت می‌شوند.</Txt>
          </FormSection>

          <FormSection title="جلد و متن">
            <ImageField label="جلد این اجرا" value={r.cover} onChange={(v) => set({ cover: v })} />
            <Field
              label="متن این اجرا"
              value={r.lyrics ?? ''}
              onChangeText={(t) => set({ lyrics: t })}
              multiline
              placeholder={tr("اگر خالی بماند، شعرِ اثر نمایش داده می‌شود.")}
              hint={hasLrc ? `متن زمان‌دار شناسایی شد ✓ هنگام پخش، هم‌گام حرکت می‌کند.` : 'برای متن هم‌گام، اول هر خط زمان بگذار: [01:23.5] مرغ سحر ناله سر کن'}
            />
            <Field label="یادداشت دربارهٔ این اجرا" value={r.notes ?? ''} onChangeText={(t) => set({ notes: t })} multiline placeholder={tr("مثلاً اجرای برنامهٔ گل‌های رنگارنگ شمارهٔ…")} />
          </FormSection>
          {r.duration ? <Txt v="caption" center>{`مدت: ${toFa(Math.round(r.duration / 60))} دقیقه`}</Txt> : null}
        </>
      ) : null}
    </EditorShell>
  );
}
