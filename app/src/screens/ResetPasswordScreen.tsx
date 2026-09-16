import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { mascots } from '../assets';
import { HC, HF } from '../theme/home';
import { radii, shadow } from '../theme';
import { supabase } from '../lib/supabase';

export default function ResetPasswordScreen({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    onDone();
  }

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={['#EAF2FF', '#4E7BFF', '#2340BE']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.select({ ios: 'padding', default: undefined })}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <Image source={mascots.brandMascot} style={styles.logo} contentFit="contain" />
            <Text style={styles.title}>Nouveau mot de passe</Text>
            <Text style={styles.subtitle}>Choisis un nouveau mot de passe pour ton compte</Text>

            <View style={styles.card}>
              <TextInput
                style={styles.input}
                placeholder="Nouveau mot de passe"
                placeholderTextColor={HC.inkSoft}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
              <TextInput
                style={styles.input}
                placeholder="Confirmer le mot de passe"
                placeholderTextColor={HC.inkSoft}
                secureTextEntry
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {error && <Text style={styles.error}>{error}</Text>}

              <Pressable onPress={handleSubmit} disabled={loading}>
                <LinearGradient
                  colors={['#34E1F0', '#12A6F2', HC.blue]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.submitBtn}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.submitText}>Valider</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  logo: { width: 96, height: 96, marginBottom: 12 },
  title: { fontFamily: HF.dispBold, fontSize: 26, color: '#fff', textAlign: 'center' },
  subtitle: {
    fontFamily: HF.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)',
    marginTop: 6, marginBottom: 28, textAlign: 'center',
  },
  card: {
    width: '100%', maxWidth: 360, backgroundColor: '#fff', borderRadius: radii.lg, padding: 22,
    alignItems: 'stretch', ...shadow.md,
  },
  input: {
    fontFamily: HF.body, fontSize: 15, color: HC.ink,
    backgroundColor: '#F1F4FA', borderRadius: radii.sm, paddingHorizontal: 16, paddingVertical: 13,
    marginBottom: 12,
  },
  error: { fontFamily: HF.bodyBold, fontSize: 12.5, color: HC.red, marginBottom: 10, textAlign: 'center' },
  submitBtn: { borderRadius: radii.md, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  submitText: { fontFamily: HF.dispBold, fontSize: 16, color: '#fff' },
});
