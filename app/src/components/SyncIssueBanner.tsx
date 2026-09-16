import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radii } from '../theme';
import { useGameStore } from '../state/game';

// Every hearts/coins/level-progress action updates the UI immediately and
// saves in the background (see game.ts). If that background save fails —
// most commonly because the session died mid-game — nothing else would ever
// tell the player their last action didn't actually persist. This is that
// signal, kept small and dismissible rather than blocking play.
export default function SyncIssueBanner() {
  const syncIssue = useGameStore((s) => s.syncIssue);
  const clearSyncIssue = useGameStore((s) => s.clearSyncIssue);
  const insets = useSafeAreaInsets();

  if (!syncIssue) return null;

  return (
    <View style={[styles.wrap, { top: insets.top + 8 }]} pointerEvents="box-none">
      <Pressable style={styles.banner} onPress={clearSyncIssue}>
        <Text style={styles.text}>⚠️ Connexion instable — ta dernière action n'a peut-être pas été sauvegardée</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000,
  },
  banner: {
    maxWidth: '92%', backgroundColor: colors.red, borderRadius: radii.md,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  text: {
    fontFamily: fonts.bodyBold, fontSize: 12.5, color: '#fff', textAlign: 'center',
  },
});
