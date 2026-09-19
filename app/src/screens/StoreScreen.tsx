import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radii, shadow } from '../theme';
import { HC } from '../theme/home';
import { mascots } from '../assets';
import { useGameStore, HEARTS_MAX } from '../state/game';
import { fetchStoreItems, type StoreItem } from '../data/storeItems';
import { playSfx } from '../audio/sound';

const STOCK_LABEL: Record<string, (n: number) => string> = {
  skip_token: (n) => `${n} en stock`,
  fifty_fifty_token: (n) => `${n} en stock`,
  heart: () => '',
};

export default function StoreScreen() {
  const coins = useGameStore((s) => s.coins);
  const hearts = useGameStore((s) => s.hearts);
  const skipTokens = useGameStore((s) => s.skipTokens);
  const fiftyFiftyTokens = useGameStore((s) => s.fiftyFiftyTokens);
  const buyStoreItem = useGameStore((s) => s.buyStoreItem);

  const [items, setItems] = useState<StoreItem[] | null>(null);
  const [buying, setBuying] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStoreItems().then(setItems).catch((e) => console.warn('fetch store items failed', e));
  }, []);

  function stockFor(key: string): number | null {
    if (key === 'skip_token') return skipTokens;
    if (key === 'fifty_fifty_token') return fiftyFiftyTokens;
    return null;
  }

  async function handleBuy(item: StoreItem) {
    if (buying) return;
    setError(null);
    if (item.key === 'heart' && hearts >= HEARTS_MAX) {
      setError('Tes cœurs sont déjà au maximum.');
      return;
    }
    if (coins < item.priceCoins) {
      setError('Pas assez de pièces 🪙');
      return;
    }
    setBuying(item.key);
    const result = await buyStoreItem(item.key, 1);
    setBuying(null);
    if (!result.ok) {
      setError(result.error === 'buy_store_item: hearts already full' ? 'Tes cœurs sont déjà au maximum.' : 'Achat impossible pour le moment.');
      return;
    }
    playSfx('coinsPay');
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
        <ScrollView contentContainerStyle={styles.content}>
          <Image source={mascots.coinsCollected} style={styles.headerMascot} contentFit="contain" />
          <Text style={styles.title}>Boutique</Text>
          <View style={styles.coinsPill}>
            <Text style={styles.coinsPillText}>🪙 {coins}</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          {!items ? (
            <ActivityIndicator color="#fff" size="large" style={{ marginTop: 24 }} />
          ) : (
            items.map((item) => {
              const stock = stockFor(item.key);
              const disabled = buying === item.key;
              return (
                <View key={item.key} style={styles.card}>
                  <Text style={styles.cardIcon}>{item.icon}</Text>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.cardLabel}>{item.label}</Text>
                    <Text style={styles.cardDesc}>{item.description}</Text>
                    {stock !== null && <Text style={styles.cardStock}>{STOCK_LABEL[item.key]?.(stock)}</Text>}
                  </View>
                  <Pressable
                    style={[styles.buyBtn, disabled && { opacity: 0.5 }]}
                    onPress={() => handleBuy(item)}
                    disabled={disabled}
                  >
                    {disabled ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.buyBtnText}>{item.priceCoins} 🪙</Text>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },
  content: { alignItems: 'center', padding: 20, paddingBottom: 40 },
  headerMascot: { width: 96, height: 96, marginBottom: 4 },
  title: { fontFamily: fonts.disp, fontSize: 24, color: '#fff', marginBottom: 10 },
  coinsPill: {
    backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 999, paddingHorizontal: 16, paddingVertical: 6,
    marginBottom: 18,
  },
  coinsPillText: { fontFamily: fonts.dispSemi, fontSize: 15, color: '#fff' },
  error: { fontFamily: fonts.bodyBold, fontSize: 13, color: '#fff', backgroundColor: colors.red, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 14, textAlign: 'center' },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12, width: '100%', maxWidth: 420,
    backgroundColor: '#fff', borderRadius: radii.md, padding: 14, marginBottom: 12, ...shadow.sm,
  },
  cardIcon: { fontSize: 30 },
  cardLabel: { fontFamily: fonts.dispSemi, fontSize: 15, color: HC.ink },
  cardDesc: { fontFamily: fonts.body, fontSize: 11.5, color: HC.inkSoft, marginTop: 2 },
  cardStock: { fontFamily: fonts.bodyExtra, fontSize: 10.5, color: HC.blue, marginTop: 4 },
  buyBtn: { backgroundColor: HC.blue, borderRadius: radii.sm, paddingHorizontal: 14, paddingVertical: 10, minWidth: 64, alignItems: 'center' },
  buyBtnText: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: '#fff' },
});
