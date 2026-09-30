import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { C, F, roleLabel, traditionLabel } from '@/src/theme';
import { Txt } from '@/src/ui/Txt';
import { Chip, Header, IconBtn, Pressy, row } from '@/src/ui/kit';
import { Ambient } from '@/src/ui/Ambient';
import { askGemini, ChatMsg } from '@/src/services/gemini';
import { listArtists, listWorks, recentlyPlayed } from '@/src/db/repo';
import { relTime, yearsLabel } from '@/src/utils';
import { Conversation, deleteConversation, getConversation, listConversations, saveConversation } from '@/src/db/extra';
import { unravel } from '@/src/ui/Unravel';
import { tr } from '@/src/i18n';

const STARTERS = ['دستگاه شور چه حال‌وهوایی دارد؟', 'بر اساس آرشیوم چه چیزی گوش بدم؟', 'فرق سونات و سمفونی چیست؟', 'از زندگی بنان بگو'];

async function buildContext(): Promise<string> {
  const [artists, works, recent] = await Promise.all([listArtists(), listWorks(), recentlyPlayed(10)]);
  const a = artists.slice(0, 120).map((x) => `- ${x.name}${x.nameLatin ? ` (${x.nameLatin})` : ''} · ${traditionLabel(x.tradition)} · ${yearsLabel(x.born, x.died)}${x.instruments ? ` · ${x.instruments}` : ''}`).join('\n');
  const w = works.slice(0, 150).map((x) => `- ${x.title}${x.composers ? ` · ${roleLabel('composer')}: ${x.composers}` : ''}${x.dastgah ? ` · ${x.dastgah}` : ''}${x.avaz ? ` · ${x.avaz}` : ''}${x.form ? ` · ${x.form}` : ''}${x.catalog ? ` · ${x.catalog}` : ''}`).join('\n');
  const r = recent.map((x) => `- ${x.title}${x.performers ? ` · ${x.performers}` : ''}`).join('\n');
  return `هنرمندان:\n${a || '—'}\n\nآثار:\n${w || '—'}\n\nاخیراً شنیده:\n${r || '—'}`;
}

export default function AskRoute() {
  return <AskScreen />;
}

/** The chat. Used as a page (/ask) and, since v1.1, as the fourth main tab. */
export function AskScreen({ inTab = false }: { inTab?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottomGap = inTab ? Math.max(insets.bottom, 12) + 6 + 64 + 14 : insets.bottom + 10;
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ctx = useRef<string | null>(null);
  const scroll = useRef<ScrollView>(null);
  const convId = useRef<string | null>(null);
  const [past, setPast] = useState<Conversation[]>([]);
  const refreshPast = () => listConversations().then(setPast).catch(() => {});
  useEffect(() => { refreshPast(); }, []);

  const openConv = async (id: string) => {
    const c = await getConversation(id);
    if (!c) return;
    try { setMsgs(JSON.parse(c.messages)); convId.current = c.id; setErr(null); } catch {}
    setTimeout(() => scroll.current?.scrollToEnd({ animated: false }), 60);
  };
  const newConv = () => { setMsgs([]); convId.current = null; setErr(null); refreshPast(); };

  const send = async (q?: string) => {
    const t = (q ?? text).trim();
    if (!t || busy) return;
    const next = [...msgs, { role: 'user' as const, text: t }];
    setMsgs(next);
    setText('');
    setBusy(true);
    setErr(null);
    try {
      if (!ctx.current) ctx.current = await buildContext();
      const answer = await askGemini(next, ctx.current);
      const done = [...next, { role: 'model' as const, text: answer }];
      setMsgs(done);
      const title = done[0].text.slice(0, 48);
      convId.current = await saveConversation({ id: convId.current ?? undefined, title, messages: done });
    } catch (e: any) {
      setErr(e?.message ?? 'خطا');
    } finally {
      setBusy(false);
      setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 80);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
      <Ambient intensity={0.9} />
      <Header back={!inTab} title="همراه نغمه" subtitle="پرسیدن دربارهٔ موسیقی و آرشیوت" right={msgs.length ? <IconBtn name="plus" onPress={newConv} label="گفت‌وگوی تازه" /> : <IconBtn name="settings" onPress={() => router.push('/settings')} />} />
      <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        {!msgs.length ? (
          <Animated.View entering={FadeInUp.duration(500)} style={{ paddingTop: 30, alignItems: 'center' }}>
            <Feather name="moon" size={30} color={C.accent} />
            <Txt v="h2" center style={{ marginTop: 12 }}>هر چه دربارهٔ موسیقی می‌خواهی بپرس</Txt>
            <View style={[row, { flexWrap: 'wrap', gap: 8, marginTop: 20, justifyContent: 'center' }]}>
              {STARTERS.map((s) => <Chip key={s} label={s} onPress={() => send(s)} />)}
            </View>
            {past.length ? (
              <View style={{ alignSelf: 'stretch', marginTop: 34 }}>
                <Txt v="label" color={C.zar} style={{ marginBottom: 8 }}>گفت‌وگوهای پیشین</Txt>
                {past.map((c) => (
                  <Pressy key={c.id} onPress={() => openConv(c.id)} onLongPress={() => Alert.alert('حذف گفت‌وگو', `«${c.title}» حذف شود؟`, [
                    { text: 'انصراف', style: 'cancel' },
                    { text: 'حذف', style: 'destructive', onPress: () => unravel(async () => { await deleteConversation(c.id); refreshPast(); }) },
                  ])} style={[row, { paddingVertical: 12, borderBottomWidth: 0.5, borderColor: C.line }]} scaleTo={0.98}>
                    <Feather name="message-circle" size={16} color={C.zar} />
                    <Txt v="body" numberOfLines={1} style={{ flex: 1, marginRight: 10 }}>{c.title}</Txt>
                    <Txt v="caption">{relTime(c.updatedAt)}</Txt>
                  </Pressy>
                ))}
                <Txt v="caption" center style={{ marginTop: 8 }}>برای حذف، انگشتت را روی گفت‌وگو نگه دار.</Txt>
              </View>
            ) : null}
          </Animated.View>
        ) : null}
        {msgs.map((m, i) => (
          <Animated.View key={i} entering={FadeInUp.duration(300)} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '88%', marginBottom: 12 }}>
            <View style={{ padding: 14, borderRadius: 20, backgroundColor: m.role === 'user' ? C.accentSoft : C.surface, borderWidth: 0.5, borderColor: C.line }}>
              <Txt v="body" selectable>{m.text}</Txt>
            </View>
          </Animated.View>
        ))}
        {busy ? <ActivityIndicator color={C.accent} style={{ alignSelf: 'flex-start', margin: 10 }} /> : null}
        {err ? (
          <Pressy onPress={() => router.push('/settings')} style={{ padding: 12 }}>
            <Txt v="small" color={C.danger} center>{err}</Txt>
          </Pressy>
        ) : null}
      </ScrollView>
      <View style={[row, { paddingHorizontal: 12, paddingTop: 8, paddingBottom: bottomGap, gap: 8, borderTopWidth: 0.5, borderColor: C.line }]}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={tr("بپرس…")}
          placeholderTextColor={C.faint}
          multiline
          style={{ flex: 1, maxHeight: 120, minHeight: 46, borderRadius: 23, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: C.surface, color: C.text, fontFamily: F.regular, fontSize: 16, textAlign: 'right', writingDirection: 'rtl' }}
        />
        <IconBtn name="send" filled onPress={() => send()} label="ارسال" style={{ transform: [{ scaleX: -1 }] }} />
      </View>
    </KeyboardAvoidingView>
  );
}
