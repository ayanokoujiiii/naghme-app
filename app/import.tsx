import React, { useState } from 'react';
import { TermehProvider } from '@/src/motifs/Termeh';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInDown, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { C } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Button, Card, Header, Pressy, row } from '@/src/ui/kit';
import { Ambient } from '@/src/ui/Ambient';
import { importAudioFiles, ImportResult } from '@/src/audio/importer';
import { toFa } from '@/src/utils';

function Bar({ value }: { value: number }) {
  const st = useAnimatedStyle(() => ({ transform: [{ scaleX: withTiming(Math.max(0.001, value), { duration: 300 }) }] }));
  return (
    <View style={{ height: 4, borderRadius: 2, backgroundColor: C.line, overflow: 'hidden', direction: 'ltr' }}>
      <Animated.View style={[{ height: 4, width: '100%', backgroundColor: C.accent, transformOrigin: 'left' }, st]} />
    </View>
  );
}

export default function ImportScreen() {
  const [busy, setBusy] = useState(false);
  const [prog, setProg] = useState<{ index: number; total: number; name: string; stage: string; fraction: number } | null>(null);
  const [results, setResults] = useState<ImportResult[] | null>(null);

  const pick = async () => {
    const res = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true, multiple: true });
    if (res.canceled || !res.assets?.length) return;
    setBusy(true);
    setResults(null);
    try {
      const out = await importAudioFiles(res.assets.map((a) => ({ uri: a.uri, name: a.name, size: a.size })), setProg);
      setResults(out);
    } finally {
      setBusy(false);
      setProg(null);
    }
  };

  const ok = results?.filter((r) => r.recordingId) ?? [];
  const bad = results?.filter((r) => r.error) ?? [];
  const overall = prog ? (prog.index + prog.fraction) / prog.total : 0;

  return (
    <TermehProvider pattern="sarv">
    <View style={{ flex: 1 }}>
      <Ambient intensity={0.7} />
      <Header title="وارد کردن موسیقی" />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120 }}>
        {!busy && !results ? (
          <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', paddingTop: 30 }}>
            <View style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: C.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
              <Feather name="download" size={36} color={C.accent} />
            </View>
            <Txt v="title" center style={{ marginTop: 22 }}>فایل‌هایت را بیاور</Txt>
            <Txt v="small" center style={{ marginTop: 8, paddingHorizontal: 12 }}>
              می‌توانی چند فایل را با هم انتخاب کنی. نام اثر، هنرمند، آلبوم و جلد از خود فایل خوانده می‌شود و بعداً هم قابل ویرایش است.
            </Txt>
            <Button label="انتخاب فایل‌ها" icon="folder" onPress={pick} style={{ marginTop: 26, alignSelf: 'stretch' }} />
            <Card soft style={{ marginTop: 28, alignSelf: 'stretch', padding: 16 }}>
              <Txt v="label" color={C.accent}>پخش مستقیم</Txt>
              <Txt v="small" style={{ marginTop: 4 }}>FLAC · WAV · ALAC · M4A/AAC · MP3 · OGG · Opus · MKA · WebM</Txt>
              <Txt v="label" color={C.accent} style={{ marginTop: 12 }}>با تبدیل یک‌باره (بی‌افت کیفیتِ محسوس)</Txt>
              <Txt v="small" style={{ marginTop: 4 }}>DSD سونی (DSF / DFF) · AIFF</Txt>
              <Txt v="caption" style={{ marginTop: 10 }}>تبدیل DSD روی گوشی کمی زمان می‌برد؛ یک بار انجامش می‌دهیم و بعد برای همیشه آماده است.</Txt>
            </Card>
          </Animated.View>
        ) : null}

        {busy && prog ? (
          <Animated.View entering={FadeIn} style={{ paddingTop: 40 }}>
            <Txt v="h2" center>{`${toFa(prog.index + 1)} از ${toFa(prog.total)}`}</Txt>
            <Txt v="small" center numberOfLines={1} style={{ marginTop: 6 }}>{prog.name}</Txt>
            <Txt v="caption" center style={{ marginBottom: 18 }}>{`${prog.stage} · ${toFa(Math.round(prog.fraction * 100))}٪`}</Txt>
            <Bar value={overall} />
            <Txt v="caption" center style={{ marginTop: 16 }}>لطفاً برنامه را نبند.</Txt>
          </Animated.View>
        ) : null}

        {results ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <Txt v="title" center style={{ marginTop: 12 }}>{ok.length ? `${toFa(ok.length)} قطعه به آرشیو اضافه شد` : 'چیزی اضافه نشد'}</Txt>
            {ok.map((r, i) => (
              <Animated.View key={r.recordingId} entering={FadeInDown.delay(i * 40)}>
                <Pressy onPress={() => router.push({ pathname: '/edit/recording', params: { id: r.recordingId! } })} style={[row, { paddingVertical: 10 }]} scaleTo={0.98}>
                  <Feather name="check-circle" size={16} color={C.accent} />
                  <Txt v="small" color={C.text} numberOfLines={1} style={{ flex: 1, marginRight: 10 }}>{r.name}</Txt>
                  {r.converted ? <Txt v="caption">تبدیل شد</Txt> : null}
                  <Feather name="edit-2" size={14} color={C.faint} style={{ marginRight: 10 }} />
                </Pressy>
              </Animated.View>
            ))}
            {bad.map((r, i) => (
              <View key={`${r.name}-${i}`} style={[row, { paddingVertical: 10, alignItems: 'flex-start' }]}>
                <Feather name="alert-circle" size={16} color={C.danger} style={{ marginTop: 3 }} />
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Txt v="small" color={C.text} numberOfLines={1}>{r.name}</Txt>
                  <Txt v="caption" color={C.danger}>{r.error}</Txt>
                </View>
              </View>
            ))}
            <View style={[row, { gap: 10, marginTop: 24 }]}>
              <Button label="باز هم" icon="plus" kind="ghost" onPress={pick} style={{ flex: 1 }} />
              <Button label="تمام" onPress={() => router.back()} style={{ flex: 1 }} />
            </View>
            {ok.length ? <Txt v="caption" center style={{ marginTop: 12 }}>روی هر قطعه بزن تا اثر، هنرمندان و متنش را کامل کنی.</Txt> : null}
          </Animated.View>
        ) : null}
      </ScrollView>
    </View>
    </TermehProvider>
  );
}
