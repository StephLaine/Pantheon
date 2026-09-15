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

type Mode = 'signIn' | 'signUp';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('signUp');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  async function handleSubmit() {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError('Entre ton e-mail et ton mot de passe.');
      return;
    }
    if (password.length < 6) {
      setError('Le mot de passe doit faire au moins 6 caractères.');
      return;
    }

    setLoading(true);
    if (mode === 'signUp') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email: trimmedEmail, password });
      setLoading(false);
      if (signUpError) { setError(signUpError.message); return; }
      if (!data.session) { setCheckEmail(true); return; }
      // session exists immediately (email confirmation disabled) — the auth
      // listener in App.tsx picks this up and swaps the screen automatically.
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: trimmedEmail, password });
      setLoading(false);
      if (signInError) { setError(signInError.message); return; }
    }
  }

  function switchMode() {
    setMode((m) => (m === 'signUp' ? 'signIn' : 'signUp'));
    setError(null);
    setCheckEmail(false);
    setResendStatus('idle');
  }

  // A stuck confirmation link (expired, or eaten by a corporate email
  // security scanner that pre-clicks links) leaves an account permanently
  // unconfirmed with no way back in — Supabase's login error for that case
  // is indistinguishable from a wrong password, so this has to be offered
  // proactively rather than triggered from a specific error code.
  async function handleResend() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Entre ton e-mail pour renvoyer la confirmation.');
      return;
    }
    setResendStatus('sending');
    const { error: resendError } = await supabase.auth.resend({ type: 'signup', email: trimmedEmail });
    setResendStatus('sent');
    setError(resendError ? resendError.message : null);
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
            <Text style={styles.title}>Pantheon Path</Text>
            <Text style={styles.subtitle}>
              {mode === 'signUp' ? 'Crée ton compte pour commencer' : 'Content de te revoir'}
            </Text>

            {checkEmail ? (
              <View style={styles.card}>
                <Text style={styles.checkEmailText}>
                  Vérifie ta boîte mail pour confirmer ton compte, puis connecte-toi.
                </Text>
                {error && <Text style={styles.error}>{error}</Text>}
                <Pressable onPress={handleResend} disabled={resendStatus === 'sending'}>
                  <Text style={styles.switchLink}>
                    {resendStatus === 'sent' ? 'E-mail renvoyé ✓' : "Le lien a expiré ? Renvoyer l'e-mail"}
                  </Text>
                </Pressable>
                <Pressable onPress={switchMode} style={{ marginTop: 14 }}>
                  <Text style={styles.switchLink}>Retour à la connexion</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.card}>
                <TextInput
                  style={styles.input}
                  placeholder="E-mail"
                  placeholderTextColor={HC.inkSoft}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Mot de passe"
                  placeholderTextColor={HC.inkSoft}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />

                {error && <Text style={styles.error}>{error}</Text>}
                {mode === 'signIn' && (error || resendStatus !== 'idle') && (
                  <Pressable onPress={handleResend} disabled={resendStatus === 'sending'} style={{ marginBottom: 12 }}>
                    <Text style={styles.switchLink}>
                      {resendStatus === 'sent' ? 'E-mail de confirmation renvoyé ✓' : "Compte pas encore confirmé ? Renvoyer l'e-mail"}
                    </Text>
                  </Pressable>
                )}

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
                      <Text style={styles.submitText}>{mode === 'signUp' ? "S'inscrire" : 'Se connecter'}</Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={switchMode} style={styles.switchRow}>
                  <Text style={styles.switchText}>
                    {mode === 'signUp' ? 'Déjà un compte ?' : "Pas encore de compte ?"}{' '}
                    <Text style={styles.switchLink}>{mode === 'signUp' ? 'Connecte-toi' : 'Inscris-toi'}</Text>
                  </Text>
                </Pressable>
              </View>
            )}
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
  subtitle: { fontFamily: HF.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)', marginTop: 6, marginBottom: 28, textAlign: 'center' },
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
  switchRow: { marginTop: 18, alignItems: 'center' },
  switchText: { fontFamily: HF.body, fontSize: 13, color: HC.inkSoft },
  switchLink: { fontFamily: HF.bodyBold, color: HC.blue },
  checkEmailText: { fontFamily: HF.bodyBold, fontSize: 14, color: HC.ink, textAlign: 'center', marginBottom: 16, lineHeight: 20 },
});
