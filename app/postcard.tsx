import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Dimensions, ScrollView, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { C, F } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Chip, Header, row } from '@/src/ui/kit';
import { FormSection } from '@/src/ui/fields';
import { CarpetBand, Doily, LaceEdge } from '@/src/motifs/Ornament';
import { getPostcard, savePostcard } from '@/src/db/extra';
import { getRecording, recArtistLine, recCover } from '@/src/db/repo';
import { persistImage } from '@/src/services/files';
import { tr } from '@/src/i18n';

type Ratio = 'square' | 'portrait' | 'story';
type Bg = 'cover' | 'image' | 'solid';
type Frame = 'none' | 'doily' | 'lace' | 'carpet';
type Tint = 'none' | 'warm' | 'cool' | 'sepia' | 'gray';
interface S { ratio: Ratio; bg: Bg; image: string | null; solid: string; blur: number; font: 'vazir' | 'lalezar' | 'nastaliq'; align: 'right' | 'center' | 'left'; size: number; color: string; tint: Tint; frame: Frame; caption: string; x: number; y: number }

const RATIOS: { k: Ratio; label: string; r: number }[] = [{ k: 'square', label: 'مربع', r: 1 }, { k: 'portrait', label: '۴:۵', r: 1.25 }, { k: 'story', label: 'استوری', r: 16 / 9 }];
const FONTS = [{ k: 'vazir', label: 'وزیر', f: F.medium }, { k: 'lalezar', label: 'لاله‌زار', f: F.lalezar }, { k: 'nastaliq', label: 'نستعلیق', f: F.nastaliq }] as const;
const SOLIDS = ['#1A1410', '#2B1D14', '#3A2A1E', '#F3E6D0', '#5B2E24', '#1F2A2E'];
const INKS = ['#F7EEDD', '#D2A15F', '#1A1410', '#E8C9A0', '#9FB7B0'];
const TINTS: { k: Tint; label: string; c: string }[] = [{ k: 'none', label: 'بی‌رنگ', c: 'transparent' }, { k: 'warm', label: 'گرم', c: 'rgba(210,140,60,0.22)' }, { k: 'cool', label: 'سرد', c: 'rgba(60,110,140,0.22)' }, { k: 'sepia', label: 'قدیمی', c: 'rgba(112,66,20,0.32)' }, { k: 'gray', label: 'خاکستری', c: 'rgba(30,30,30,0.35)' }];
const FRAMES: { k: Frame; label: string }[] = [{ k: 'none', label: 'بی‌قاب' }, { k: 'doily', label: 'رومیزی' }, { k: 'lace', label: 'تورِ حاشیه' }, { k: 'carpet', label: 'حاشیهٔ فرش' }];

export default function PostcardEditor() {
  const { id, rec } = useLocalSearchParams<{ id?: string; rec?: string }>();
  const shot = useRef<View>(null);
  const [pid, setPid] = useState<string | undefined>(id);
  const [text, setText] = useState('');
  const [cover, setCover] = useState<string | null>(null);
  const [recId, setRecId] = useState<string | null>(rec ?? null);
  const [busy, setBusy] = useState<string | null>(null);
  const [s, setS] = useState<S>({ ratio: 'portrait', bg: 'cover', image: null, solid: SOLIDS[0], blur: 6, font: 'nastaliq', align: 'center', size: 26, color: INKS[0], tint: 'warm', frame: 'doily', caption: '', x: 0, y: 0 });
  const set = (p: Partial<S>) => setS((o) => ({ ...o, ...p }));
  const W = Dimensions.get('window').width - 32;
  const H = W * (RATIOS.find((r) => r.k === s.ratio)?.r ?? 1.25);
  const tx = useSharedValue(0), ty = useSharedValue(0), ox = useSharedValue(0), oy = useSharedValue(0);

  useEffect(() => { (async () => {
    if (id) {
      const p = await getPostcard(id);
      if (p) { setText(p.text); setRecId(p.recordingId); try { const st = JSON.parse(p.settings); setS((o) => ({ ...o, ...st })); tx.value = st.x ?? 0; ty.value = st.y ?? 0; } catch {} }
    }
    const rid = rec ?? (id ? (await getPostcard(id))?.recordingId : null);
    if (rid) {
      const r = await getRecording(rid);
      if (r) { setCover(recCover(r)); if (!id) { setText((r.lyrics || r.workLyrics || '').split('\n').filter(Boolean).slice(0, 2).join('\n')); set({ caption: [r.title, recArtistLine(r)].filter(Boolean).join(' · ') }); } }
    }
  })(); }, [id, rec]);

  const pan = useMemo(() => Gesture.Pan()
    .onStart(() => { ox.value = tx.value; oy.value = ty.value; })
    .onUpdate((e) => { tx.value = ox.value + e.translationX; ty.value = oy.value + e.translationY; }), []);
  const drag = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }));

  const bgUri = s.bg === 'image' ? s.image : s.bg === 'cover' ? cover : null;
  const fontFamily = FONTS.find((f) => f.k === s.font)?.f ?? F.medium;
  const tint = TINTS.find((t) => t.k === s.tint)?.c ?? 'transparent';

  const pickBg = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!res.canceled && res.assets[0]) set({ bg: 'image', image: persistImage(res.assets[0].uri) });
  };
  const capture = (format: 'jpg' | 'png') => captureRef(shot, { format, quality: 0.95, result: 'tmpfile' });
  const doShare = async (format: 'jpg' | 'png') => {
    setBusy(format);
    try { const uri = await capture(format); await Sharing.shareAsync(uri, { mimeType: format === 'png' ? 'image/png' : 'image/jpeg', dialogTitle: 'فرستادن کارت‌پستال' }); }
    catch (e: any) { Alert.alert('مشکلی پیش آمد', e?.message ?? ''); } finally { setBusy(null); }
  };
  const doSave = async () => {
    setBusy('save');
    try {
      const preview = persistImage(await capture('jpg'));
      const title = (text.split('\n')[0] || s.caption || 'کارت‌پستال').slice(0, 40);
      const nid = await savePostcard({ id: pid, title, text, recordingId: recId, settings: JSON.stringify({ ...s, x: tx.value, y: ty.value }), preview });
      setPid(nid);
      Alert.alert('ذخیره شد', 'کارت در فهرست کارت‌پستال‌ها نشست.', [{ text: 'باشه' }, { text: 'دیدن فهرست', onPress: () => router.push('/postcards') }]);
    } catch (e: any) { Alert.alert('مشکلی پیش آمد', e?.message ?? ''); } finally { setBusy(null); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header title="کارگاه کارت‌پستال" subtitle="نوشته را با انگشت جابه‌جا کن" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <View ref={shot} collapsable={false} style={{ width: W, height: H, borderRadius: 18, overflow: 'hidden', backgroundColor: s.solid }}>
          {bgUri ? <Image source={{ uri: bgUri }} style={{ position: 'absolute', width: W, height: H }} contentFit="cover" blurRadius={s.blur} /> : null}
          <View style={{ position: 'absolute', width: W, height: H, backgroundColor: tint }} />
          {s.frame === 'doily' ? (<>
            <Doily size={W * 0.62} seed="card-a" opacity={0.55} style={{ position: 'absolute', top: -W * 0.31, right: -W * 0.31 }} />
            <Doily size={W * 0.62} seed="card-b" opacity={0.55} style={{ position: 'absolute', bottom: -W * 0.31, left: -W * 0.31 }} />
          </>) : null}
          {s.frame === 'lace' ? (<>
            <LaceEdge width={W} height={26} opacity={0.8} style={{ position: 'absolute', top: 0 }} />
            <LaceEdge width={W} height={26} flip opacity={0.8} style={{ position: 'absolute', bottom: 0 }} />
          </>) : null}
          {s.frame === 'carpet' ? (<>
            <CarpetBand width={W} height={20} opacity={0.9} style={{ position: 'absolute', top: 8 }} />
            <CarpetBand width={W} height={20} opacity={0.9} style={{ position: 'absolute', bottom: 8 }} />
          </>) : null}
          <GestureDetector gesture={pan}>
            <Animated.View style={[{ position: 'absolute', left: 24, right: 24, top: H * 0.34 }, drag]}>
              <Txt style={{ fontFamily, fontSize: s.size, lineHeight: s.size * (s.font === 'nastaliq' ? 2.2 : 1.6), color: s.color, textAlign: s.align, textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 6 }}>{text || 'بیتی بنویس…'}</Txt>
              {s.caption ? <Txt v="caption" style={{ color: s.color, opacity: 0.8, textAlign: s.align, marginTop: 8 }}>{s.caption}</Txt> : null}
            </Animated.View>
          </GestureDetector>
        </View>

        <TextInput value={text} onChangeText={setText} multiline placeholder={tr("متن کارت: بیت، جمله یا یادداشت…")} placeholderTextColor={C.faint}
          style={{ marginTop: 14, minHeight: 70, borderRadius: 16, padding: 14, backgroundColor: C.surface, color: C.text, fontFamily: F.regular, fontSize: 14.5, textAlign: 'right', writingDirection: 'rtl' }} />
        <TextInput value={s.caption} onChangeText={(t) => set({ caption: t })} placeholder={tr("زیرنویس (نام قطعه و هنرمند)")} placeholderTextColor={C.faint}
          style={{ marginTop: 8, borderRadius: 14, padding: 12, backgroundColor: C.surface, color: C.text, fontFamily: F.regular, fontSize: 13, textAlign: 'right' }} />

        <FormSection title="اندازهٔ کارت">
          <View style={[row, { gap: 8 }]}>{RATIOS.map((r) => <Chip key={r.k} label={r.label} active={s.ratio === r.k} onPress={() => set({ ratio: r.k })} />)}</View>
        </FormSection>
        <FormSection title="زمینه">
          <View style={[row, { gap: 8, flexWrap: 'wrap' }]}>
            {cover ? <Chip label="جلد قطعه" active={s.bg === 'cover'} onPress={() => set({ bg: 'cover' })} /> : null}
            <Chip label="عکس از گالری گوشی" icon="image" active={s.bg === 'image'} onPress={pickBg} />
            <Chip label="رنگ ساده" active={s.bg === 'solid'} onPress={() => set({ bg: 'solid' })} />
          </View>
          <View style={[row, { gap: 10, marginTop: 10 }]}>{SOLIDS.map((c) => <Chip key={c} label="●" color={c} active={s.solid === c} onPress={() => set({ solid: c, bg: s.bg === 'solid' ? 'solid' : s.bg })} />)}</View>
          <View style={[row, { gap: 8, marginTop: 10 }]}>{[0, 6, 14, 24].map((b, i) => <Chip key={b} label={['بی‌تاری', 'کمی تار', 'تار', 'مه‌آلود'][i]} active={s.blur === b} onPress={() => set({ blur: b })} />)}</View>
        </FormSection>
        <FormSection title="نوشته">
          <View style={[row, { gap: 8 }]}>{FONTS.map((f) => <Chip key={f.k} label={f.label} active={s.font === f.k} onPress={() => set({ font: f.k })} />)}</View>
          <View style={[row, { gap: 8, marginTop: 10 }]}>{([['right', 'راست'], ['center', 'وسط'], ['left', 'چپ']] as const).map(([k, l]) => <Chip key={k} label={l} active={s.align === k} onPress={() => set({ align: k })} />)}</View>
          <View style={[row, { gap: 8, marginTop: 10 }]}>{[20, 26, 34, 44].map((z, i) => <Chip key={z} label={['ریز', 'میانه', 'درشت', 'خیلی درشت'][i]} active={s.size === z} onPress={() => set({ size: z })} />)}</View>
          <View style={[row, { gap: 10, marginTop: 10 }]}>{INKS.map((c) => <Chip key={c} label="●" color={c} active={s.color === c} onPress={() => set({ color: c })} />)}</View>
        </FormSection>
        <FormSection title="رنگ‌مایه و قاب">
          <View style={[row, { gap: 8, flexWrap: 'wrap' }]}>{TINTS.map((t) => <Chip key={t.k} label={t.label} active={s.tint === t.k} onPress={() => set({ tint: t.k })} />)}</View>
          <View style={[row, { gap: 8, flexWrap: 'wrap', marginTop: 10 }]}>{FRAMES.map((f) => <Chip key={f.k} label={f.label} active={s.frame === f.k} onPress={() => set({ frame: f.k })} />)}</View>
        </FormSection>

        <Button label="ذخیره در کارت‌پستال‌ها" icon="bookmark" loading={busy === 'save'} onPress={doSave} style={{ marginTop: 16 }} />
        <View style={[row, { gap: 10, marginTop: 10 }]}>
          <Button label="فرستادن (JPG)" icon="share-2" kind="ghost" loading={busy === 'jpg'} onPress={() => doShare('jpg')} style={{ flex: 1 }} />
          <Button label="فرستادن (PNG)" icon="share" kind="ghost" loading={busy === 'png'} onPress={() => doShare('png')} style={{ flex: 1 }} />
        </View>
      </ScrollView>
    </View>
  );
}
