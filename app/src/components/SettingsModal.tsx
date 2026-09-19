import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal, Switch, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { HC } from '../theme/home';
import { colors, fonts, radii, shadow } from '../theme';
import { useGameStore } from '../state/game';
import { playSfx, setAudioEnabled } from '../audio/sound';
import { supabase } from '../lib/supabase';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function SettingsModal({ visible, onClose }: Props) {
  const resetGame = useGameStore((s) => s.resetGame);
  const [sfxOn, setSfxOn] = useState(true);
  const [musicOn, setMusicOn] = useState(true);
  const [confirmingReset, setConfirmingReset] = useState(false);

  function toggleSfx(next: boolean) {
    setSfxOn(next);
    setAudioEnabled({ sfx: next });
    if (next) playSfx('tap');
  }

  function toggleMusic(next: boolean) {
    setMusicOn(next);
    setAudioEnabled({ music: next });
    if (sfxOn) playSfx('tap');
  }

  function close() {
    if (sfxOn) playSfx('tap');
    setConfirmingReset(false);
    onClose();
  }

  function handleResetPress() {
    if (sfxOn) playSfx('select');
    setConfirmingReset(true);
  }

  function confirmReset() {
    resetGame();
    if (sfxOn) playSfx('chainBreak');
    setConfirmingReset(false);
    onClose();
  }

  function handleSignOut() {
    if (sfxOn) playSfx('tap');
    onClose();
    supabase.auth.signOut();
  }

  return (
    <Modal transparent visible={visible} animationType={Platform.OS === 'web' ? 'none' : 'slide'} onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Pressable style={styles.closeBtn} onPress={close}>
            <Text style={{ color: HC.inkSoft }}>✕</Text>
          </Pressable>

          <Text style={styles.title}>Réglages</Text>
          <Text style={styles.subtitle}>Personnalise ton expérience de jeu</Text>

          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowLabel}>🔊 Effets sonores</Text>
              <Text style={styles.rowSub}>Sons des réponses, cœurs, célébrations</Text>
            </View>
            <Switch
              value={sfxOn}
              onValueChange={toggleSfx}
              trackColor={{ false: '#D8DEEC', true: HC.blueLt }}
              thumbColor="#fff"
              ios_backgroundColor="#D8DEEC"
            />
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowLabel}>🎵 Musique</Text>
              <Text style={styles.rowSub}>Ambiance sonore de chaque niveau</Text>
            </View>
            <Switch
              value={musicOn}
              onValueChange={toggleMusic}
              trackColor={{ false: '#D8DEEC', true: HC.blueLt }}
              thumbColor="#fff"
              ios_backgroundColor="#D8DEEC"
            />
          </View>

          <View style={styles.divider} />

          {!confirmingReset ? (
            <Pressable style={styles.dangerRow} onPress={handleResetPress}>
              <Text style={styles.dangerIcon}>🗑️</Text>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.dangerLabel}>Réinitialiser la progression</Text>
                <Text style={styles.rowSub}>Cœurs, niveaux et série repartent à zéro</Text>
              </View>
            </Pressable>
          ) : (
            <View style={styles.confirmBox}>
              <Text style={styles.confirmText}>Tout effacer et recommencer depuis le niveau 1 ?</Text>
              <View style={styles.confirmActions}>
                <Pressable style={styles.confirmCancel} onPress={() => setConfirmingReset(false)}>
                  <Text style={styles.confirmCancelText}>Annuler</Text>
                </Pressable>
                <Pressable onPress={confirmReset}>
                  <LinearGradient colors={[HC.red, '#FF6B6B']} style={styles.confirmDelete}>
                    <Text style={styles.confirmDeleteText}>Réinitialiser</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          )}

          <Pressable style={styles.signOutRow} onPress={handleSignOut}>
            <Text style={styles.signOutText}>Se déconnecter</Text>
          </Pressable>

          <Text style={styles.version}>Pantheon Path · v1.0.0</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,20,45,0.6)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingTop: 26, alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(15,35,80,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: fonts.disp, fontSize: 19, color: HC.ink, marginBottom: 4, textAlign: 'center' },
  subtitle: { fontFamily: fonts.bodyBold, fontSize: 13, color: HC.inkSoft, marginBottom: 18, textAlign: 'center' },

  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
    paddingVertical: 12,
  },
  rowLabel: { fontFamily: fonts.dispSemi, fontSize: 14.5, color: HC.ink },
  rowSub: { fontFamily: fonts.bodyExtra, fontSize: 10.5, color: HC.inkSoft, marginTop: 2 },

  divider: { width: '100%', height: 1, backgroundColor: 'rgba(15,35,80,0.08)', marginVertical: 6 },

  dangerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%',
    paddingVertical: 12,
  },
  dangerIcon: { fontSize: 20 },
  dangerLabel: { fontFamily: fonts.dispSemi, fontSize: 14.5, color: HC.red },

  confirmBox: { width: '100%', paddingVertical: 8 },
  confirmText: { fontFamily: fonts.bodyBold, fontSize: 13, color: HC.ink, marginBottom: 12, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  confirmCancel: {
    paddingVertical: 12, paddingHorizontal: 20, borderRadius: radii.sm,
    backgroundColor: 'rgba(15,35,80,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  confirmCancelText: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: HC.inkSoft },
  confirmDelete: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: radii.sm, ...shadow.sm },
  confirmDeleteText: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: '#fff' },

  signOutRow: { marginTop: 14, paddingVertical: 10 },
  signOutText: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: HC.inkSoft, textAlign: 'center' },

  version: { fontFamily: fonts.bodyExtra, fontSize: 10, color: HC.inkSoft, marginTop: Platform.select({ ios: 4, default: 10 }), opacity: 0.6 },
});
