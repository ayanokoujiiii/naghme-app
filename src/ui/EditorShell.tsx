import React from 'react';
import { KeyboardAvoidingView, ScrollView, View } from 'react-native';
import { C } from '../theme';
import { Ambient } from './Ambient';
import { Button, Header, Loading } from './kit';

/** Shared calm frame for every editor: header, scroll body, sticky save button. */
export function EditorShell({ title, subtitle, loading, saving, canSave = true, onSave, saveLabel = 'ذخیره', children, right }: {
  title: string; subtitle?: string; loading?: boolean; saving?: boolean; canSave?: boolean; onSave: () => void; saveLabel?: string; children?: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior="padding">
      <Ambient intensity={0.5} />
      <Header title={title} subtitle={subtitle} right={right} />
      {loading ? <Loading /> : (
        <>
          <ScrollView contentContainerStyle={{ paddingTop: 6, paddingBottom: 120 }} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 22 }}>
            <Button label={saveLabel} icon="check" onPress={onSave} loading={saving} disabled={!canSave} />
          </View>
        </>
      )}
    </KeyboardAvoidingView>
  );
}
