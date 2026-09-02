import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { colors, fonts } from '../theme';

const TABS: Record<string, { label: string; icon: string }> = {
  Home: { label: 'Accueil', icon: '🏠' },
  Play: { label: 'Jouer', icon: '🎮' },
  Ranking: { label: 'Classement', icon: '🏆' },
  Rewards: { label: 'Récompenses', icon: '🎁' },
  Profile: { label: 'Profil', icon: '👤' },
};

export default function BottomNav({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.nav, { bottom: Math.max(12, insets.bottom) }]}>
      {state.routes.map((route, index) => {
        const meta = TABS[route.name] ?? { label: route.name, icon: '•' };
        const focused = state.index === index;
        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.btn}
          >
            <Text style={[styles.icon, focused && styles.iconOn]}>{meta.icon}</Text>
            <Text style={[styles.label, focused && styles.labelOn]}>{meta.label}</Text>
            {focused && <View style={styles.dot} />}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 70,
    borderRadius: 26,
    backgroundColor: 'rgba(24,17,8,0.98)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,60,0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 34,
    elevation: 12,
  },
  btn: { alignItems: 'center', gap: 3, paddingVertical: 6, paddingHorizontal: 10 },
  icon: { fontSize: 20, opacity: 0.6 },
  iconOn: { opacity: 1 },
  label: {
    fontFamily: fonts.bodyExtra,
    fontSize: 9,
    letterSpacing: 0.3,
    color: 'rgba(255,232,190,0.55)',
  },
  labelOn: { color: '#fff' },
  dot: {
    position: 'absolute',
    bottom: -8,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.gold,
  },
});
