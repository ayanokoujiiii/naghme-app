import React, { useEffect, useState } from 'react';
import { TermehProvider } from '@/src/motifs/Termeh';
import { Alert, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Chip, Header, Pressy, row } from '@/src/ui/kit';
import { Field, FormSection } from '@/src/ui/fields';
import { Ambient } from '@/src/ui/Ambient';
import { getSetting, setSetting } from '@/src/db/repo';
import { seedStarter } from '@/src/db/seed';
import { exportPack, importPack } from '@/src/services/pack';
import { folderSize, imagesDir, musicDir } from '@/src/services/files';
import { toFa } from '@/src/utils';
import { DEFAULT_MODEL, GeminiModel, listGeminiModels } from '@/src/services/gemini';
import { setLangNow, tr, useLang } from '@/src/i18n';

function mb(bytes: number) {
  if (bytes > 1024 ** 3) return `${toFa((bytes / 1024 ** 3).toFixed(1))} گیگابایت`;
  return `${toFa(Math.round(bytes / 1024 ** 2))} مگابایت`;
}

function LinkRow({ icon, title, hint, onPress }: { icon: any; title: string; hint?: string; onPress: () => void }) {
  return (
    <Pressy onPress={onPress} style={[row, { paddingVertical: 10 }]} scaleTo={0.98}>
      <Feather name={icon} size={18} color={C.accent} />
      <View style={{ flex: 1, marginRight: 12 }}>
        <Txt v="h3">{title}</Txt>
        {hint ? <Txt v="caption">{hint}</Txt> : null}
      </View>
      <Feather name="chevron-left" size={18} color={C.faint} />
    </Pressy>
  );
}

export default function SettingsScreen() {
  const [key, setKey] = useState('');
  const [rate, setRate] = useState('88200');
  const [busy, setBusy] = useState<string | null>(null);
  const [sizes, setSizes] = useState({ music: 0, images: 0 });
  const [model, setModel] = useState('');
  const [models, setModels] = useState<GeminiModel[]>([]);

  useEffect(() => {
    (async () => {
      setKey((await getSetting('geminiKey')) ?? '');
      setRate((await getSetting('dsdRate')) ?? '88200');
      setModel((await getSetting('geminiModel')) ?? '');
      setSizes({ music: folderSize(musicDir()), images: folderSize(imagesDir()) });
    })();
  }, []);

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try { await fn(); } catch (e: any) { Alert.alert('مشکلی پیش آمد', e?.message ?? ''); } finally { setBusy(null); }
  };

  const loadModels = () => run('models', async () => {
    const k = key.trim() || (await getSetting('geminiKey')) || '';
    if (!k) throw new Error('اول کلید Gemini را وارد کن.');
    const list = await listGeminiModels(k);
    if (!list.length) throw new Error('مدلی برای این کلید پیدا نشد.');
    setModels(list);
  });

  const doRestore = (uri: string, mode: 'merge' | 'replace') => run('import', async () => {
    const n = await importPack(uri, mode);
    const lost = n.missingAudio ? `\n${toFa(n.missingAudio)} قطعه فایل صوتی ندارد و باید دوباره وصل شود.` : '';
    Alert.alert(mode === 'replace' ? 'آرشیو جایگزین شد' : 'بسته افزوده شد', `${toFa(n.artists)} هنرمند، ${toFa(n.works)} اثر، ${toFa(n.recordings)} اجرا${lost}`);
  });

  const pickRestore = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (res.canceled || !res.assets?.[0]) return;
    const uri = res.assets[0].uri;
    Alert.alert('چطور وارد شود؟', 'افزودن: کنار آرشیو فعلی می‌نشیند.\nجایگزینی: آرشیو فعلی پاک و این بسته جایش می‌آید.', [
      { text: 'انصراف', style: 'cancel' },
      { text: 'جایگزینی', style: 'destructive', onPress: () => Alert.alert('مطمئنی؟', 'همهٔ هنرمندان، آثار، یادداشت‌ها و تاریخچهٔ فعلی پاک می‌شوند. این کار برگشت ندارد.', [
        { text: 'انصراف', style: 'cancel' },
        { text: 'پاک کن و جایگزین کن', style: 'destructive', onPress: () => doRestore(uri, 'replace') },
      ]) },
      { text: 'افزودن', onPress: () => doRestore(uri, 'merge') },
    ]);
  };

  const build = (Constants.expoConfig?.extra as any)?.buildNumber ?? 1;
  const lang = useLang((l) => l.lang);
  const chooseLang = async (next: 'fa' | 'en') => {
    if (next === lang) return;
    await setSetting('lang', next);
    setLangNow(next);
  };

  return (
    <TermehProvider pattern="gereh">
    <View style={{ flex: 1 }}>
      <Ambient intensity={0.5} />
      <Header title="تنظیمات" />
      <ScrollView contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }} keyboardShouldPersistTaps="handled">
        <Animated.View entering={FadeInDown.duration(400)}>
          <FormSection title="زبان برنامه">
            <View style={[row, { gap: 8 }]}>
              <Chip label="فارسی" active={lang === 'fa'} onPress={() => void chooseLang('fa')} />
              <Chip label="English" active={lang === 'en'} onPress={() => void chooseLang('en')} />
            </View>
            <Txt v="caption" style={{ marginTop: 10 }}>نوشته‌های برنامه به زبان انتخابی نشان داده می‌شوند. نام‌ها، شعرها و یادداشت‌های خودت همان‌طور که نوشته‌ای می‌مانند.</Txt>
          </FormSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(30).duration(400)}>
          <FormSection title="کیفیت تبدیل DSD">
            <View style={[row, { gap: 8 }]}>
              <Chip label="۸۸٫۲ کیلوهرتز · ۲۴ بیت" active={rate === '88200'} onPress={async () => { setRate('88200'); await setSetting('dsdRate', '88200'); }} />
              <Chip label="۴۴٫۱ کیلوهرتز · سبک‌تر" active={rate === '44100'} onPress={async () => { setRate('44100'); await setSetting('dsdRate', '44100'); }} />
            </View>
            <Txt v="caption" style={{ marginTop: 10 }}>فایل‌های DSF و DFF یک بار موقع ورود تبدیل می‌شوند. ۸۸٫۲ کیفیت بهتری دارد و فضای بیشتری می‌گیرد.</Txt>
          </FormSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(400)}>
          <FormSection title="اشتراک و پشتیبان">
            <Txt v="small" style={{ marginBottom: 12 }}>«بستهٔ اشتراک» سبک است: هنرمندان، آثار، متن‌ها، عکس‌ها و نت‌ها، بدون فایل صوتی، تاریخچه و یادداشت‌های شخصی. «پشتیبان کامل» همه‌چیز را نگه می‌دارد تا روی همین گوشی یا گوشی تازه برگردانی.</Txt>
            <View style={[row, { gap: 10 }]}>
              <Button label="بستهٔ اشتراک" icon="share-2" loading={busy === 'share'} onPress={() => run('share', () => exportPack('share'))} style={{ flex: 1 }} />
              <Button label="پشتیبان کامل" icon="archive" kind="ghost" loading={busy === 'backup'} onPress={() => run('backup', () => exportPack('backup'))} style={{ flex: 1 }} />
            </View>
            <Button label="بازگردانی از بسته یا پشتیبان" icon="download" kind="ghost" loading={busy === 'import'} style={{ marginTop: 10 }} onPress={pickRestore} />
            <Txt v="caption" style={{ marginTop: 8 }}>فایل‌های صوتی به‌خاطر حجم زیاد در پشتیبان نمی‌آیند؛ پس از بازگردانی، هر قطعه‌ای که صدایش پیدا نشود با یک بار انتخاب دوبارهٔ فایل وصل می‌شود.</Txt>
          </FormSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(120).duration(400)}>
          <FormSection title="همراه هوشمند">
            <Field label="کلید Gemini (اختیاری)" value={key} onChangeText={setKey} ltr autoCapitalize="none" autoCorrect={false} secureTextEntry placeholder={tr("کلید را اینجا بچسبان")} hint="رایگان از aistudio.google.com گرفته می‌شود. فقط روی همین گوشی ذخیره می‌شود." />
            <View style={[row, { gap: 10 }]}>
              <Button label="ذخیره" onPress={async () => { await setSetting('geminiKey', key.trim() || null); Alert.alert('ذخیره شد'); }} style={{ flex: 1 }} />
              <Button label="گفت‌وگو" icon="message-circle" kind="ghost" onPress={() => router.navigate('/chat')} style={{ flex: 1 }} />
            </View>
            <View style={[row, { justifyContent: 'space-between', marginTop: 16 }]}>
              <Txt v="label">مدل</Txt>
              <Pressy onPress={loadModels} scaleTo={0.96}><Txt v="small" color={C.zar}>{busy === 'models' ? 'در حال دریافت…' : 'دریافت فهرست مدل‌ها'}</Txt></Pressy>
            </View>
            <View style={[row, { flexWrap: 'wrap', gap: 8, marginTop: 8 }]}>
              {(models.length ? models : [{ id: DEFAULT_MODEL, name: DEFAULT_MODEL }]).map((m) => (
                <Chip key={m.id} label={m.name} active={(model || DEFAULT_MODEL) === m.id} onPress={async () => { setModel(m.id); await setSetting('geminiModel', m.id); }} />
              ))}
            </View>
          </FormSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(180).duration(400)}>
          <FormSection title="آرشیو">
            <LinkRow icon="book-open" title="یادداشت‌ها" hint="دفتر شنیدن" onPress={() => router.push('/journal')} />
            <LinkRow icon="clock" title="تاریخچهٔ شنیدن" hint="هر چه شنیده‌ای، ماه به ماه" onPress={() => router.push('/history')} />
            <LinkRow icon="image" title="کارت‌پستال‌ها" hint="عکس‌نوشته از بیت‌ها و قطعه‌های محبوبت" onPress={() => router.push('/postcards')} />
            <LinkRow icon="message-circle" title="گفت‌وگوهای ذخیره‌شده" hint="ادامهٔ پرسش‌های پیشین" onPress={() => router.navigate('/chat')} />
            <LinkRow icon="star" title="افزودن نمونهٔ آغازین" hint="چند هنرمند و اثر شناخته‌شده برای شروع (تکراری اضافه نمی‌شود)" onPress={() => run('seed', seedStarter)} />
            <View style={[row, { justifyContent: 'space-between', marginTop: 10 }]}>
              <Txt v="small">موسیقی</Txt><Txt v="small" color={C.text}>{mb(sizes.music)}</Txt>
            </View>
            <View style={[row, { justifyContent: 'space-between' }]}>
              <Txt v="small">تصاویر</Txt><Txt v="small" color={C.text}>{mb(sizes.images)}</Txt>
            </View>
          </FormSection>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(240).duration(400)}>
          <FormSection title="قالب‌های پشتیبانی‌شده">
            <Txt v="small">پخش مستقیم: FLAC، WAV، ALAC، M4A/AAC، MP3، OGG، Opus، MKA، WebM، 3GP، AMR</Txt>
            <Txt v="small" style={{ marginTop: 6 }}>با تبدیل یک‌باره به WAV ۲۴ بیتی: DSD سونی (DSF، DFF)، AIFF</Txt>
            <Txt v="caption" style={{ marginTop: 6 }}>فعلاً پشتیبانی نمی‌شود: DFF فشرده (DST)، APE، WavPack. این‌ها را اول به FLAC تبدیل کن.</Txt>
          </FormSection>
        </Animated.View>

        <View style={{ alignItems: 'center', marginTop: 20 }}>
          <Txt v="h2" color={C.accent} center>نغمه</Txt>
          <Txt v="caption" center>{`آرشیو شنیدن ژرف · نسخهٔ ۱.۰ · ساخت ${toFa(build)}`}</Txt>
        </View>
      </ScrollView>
    </View>
    </TermehProvider>
  );
}
