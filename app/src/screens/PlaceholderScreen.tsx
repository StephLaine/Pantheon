import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

export default function PlaceholderScreen({ title }: { title: string }) {
  return (
    <View style={styles.screen}>
      <SafeAreaView style={styles.center} edges={['top']}>
        <Text style={styles.emoji}>🏛️</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>Bientôt disponible</Text>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.skyTop },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emoji: { fontSize: 44, marginBottom: 6 },
  title: { fontFamily: fonts.disp, fontSize: 22, color: '#fff' },
  sub: {
    fontFamily: fonts.bodyExtra,
    fontSize: 12,
    letterSpacing: 0.5,
    color: 'rgba(255,255,255,0.75)',
    textTransform: 'uppercase',
  },
});
