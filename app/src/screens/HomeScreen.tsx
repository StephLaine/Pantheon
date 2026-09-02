import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { mascots } from '../assets';
import { HC, HF } from '../theme/home';
import { useGameStore, HEARTS_MAX } from '../state/game';
import StreakReveal from '../components/StreakReveal';

const UNREAD_NOTIFICATIONS = 3;

const STREAK_DAYS = 12;

const QUICK_LINKS = [
  { key: 'categories', icon: '📚', label: 'Catégories', bg: [HC.blueLt, HC.blue], msg: 'Ouverture des catégories…' },
  { key: 'daily', icon: '🎯', label: 'Quotidien', bg: [HC.red, '#FF6B6B'], msg: '🎯 Récompense quotidienne : +250 XP et 50 pièces !', dot: true },
  { key: 'settings', icon: '⚙️', label: 'Réglages', bg: ['#8894A8', '#5C6B82'], msg: 'Ouverture des réglages…' },
];

export default function HomeScreen() {
  const navigation = useNavigation();
  const hearts = useGameStore((s) => s.hearts);
  const hasSeenStreakIntro = useGameStore((s) => s.hasSeenStreakIntro);
  const markStreakIntroSeen = useGameStore((s) => s.markStreakIntroSeen);
  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // entrance (staggered fade + rise)
  const headerA = useRef(new Animated.Value(0)).current;
  const heroA = useRef(new Animated.Value(0)).current;
  const btnA = useRef(new Animated.Value(0)).current;

  // ambient loops
  const avatarPulse = useRef(new Animated.Value(0)).current;
  const mascotBob = useRef(new Animated.Value(0)).current;
  const btnGlow = useRef(new Animated.Value(0)).current;
  const sheen = useRef(new Animated.Value(0)).current;
  const xpFill = useRef(new Animated.Value(0)).current;

  // press feedback
  const btnScale = useRef(new Animated.Value(1)).current;
  const profileScale = useRef(new Animated.Value(1)).current;
  const notifScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.stagger(140, [
      Animated.timing(headerA, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(heroA, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(btnA, { toValue: 1, duration: 480, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    Animated.timing(xpFill, { toValue: 1, duration: 1400, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();

    const loop = (val: Animated.Value, duration: number, native: boolean) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(val, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
          Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: native }),
        ]),
      );
    const avatarLoop = loop(avatarPulse, 1200, true);
    const mascotLoop = loop(mascotBob, 2100, true);
    // shadowRadius/shadowOpacity aren't native-driver-compatible — must animate on the JS thread
    const glowLoop = loop(btnGlow, 1300, false);
    avatarLoop.start();
    mascotLoop.start();
    glowLoop.start();

    const sheenLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(sheen, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
        Animated.delay(2300),
        Animated.timing(sheen, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    sheenLoop.start();

    return () => {
      avatarLoop.stop();
      mascotLoop.stop();
      glowLoop.stop();
      sheenLoop.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function say(msg: string) {
    setToast(msg);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, 1600);
  }

  function pressIn() {
    Animated.spring(btnScale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }
  function pressOut() {
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }

  function profilePressIn() {
    Animated.spring(profileScale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  }
  function profilePressOut() {
    Animated.spring(profileScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start();
  }

  function notifPressIn() {
    Animated.spring(notifScale, { toValue: 0.9, useNativeDriver: true, speed: 50, bounciness: 6 }).start();
  }
  function notifPressOut() {
    Animated.spring(notifScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 10 }).start();
  }

  const riseStyle = (a: Animated.Value) => ({
    opacity: a,
    transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
  });

  return (
    <View style={styles.screen}>
      {/* .screen background: radial highlight (top-left) + diagonal linear gradient */}
      <LinearGradient
        colors={['#EAF2FF', '#4E7BFF', '#2340BE']}
        locations={[0, 0.48, 1]}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(207,227,255,0.85)', 'rgba(207,227,255,0)']}
        style={styles.radialHighlight}
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {/* HEADER */}
        <Animated.View style={[styles.topbar, riseStyle(headerA)]}>
          <Pressable
            onPress={() => (navigation as any).navigate('Profile')}
            onPressIn={profilePressIn}
            onPressOut={profilePressOut}
          >
            <Animated.View
              style={[
                {
                  transform: [
                    { scale: avatarPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
                    { scale: profileScale },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={[HC.orange, HC.cyan, HC.green, HC.blue, HC.orange]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <View style={styles.avatarInner}>
                  <Image source={mascots.brandMascot} style={styles.avatarImg} contentFit="cover" />
                </View>
              </LinearGradient>
              <View style={styles.lvlBadge}>
                <Text style={styles.lvlText}>NIV 12</Text>
              </View>
            </Animated.View>
          </Pressable>

          <View style={styles.who}>
            <Text style={styles.hi}>BON RETOUR</Text>
            <Text style={styles.name}>Alex</Text>
            <View style={styles.xpTrack}>
              <Animated.View
                style={{
                  height: '100%',
                  width: xpFill.interpolate({ inputRange: [0, 1], outputRange: ['0%', '80%'] }),
                }}
              >
                <LinearGradient
                  colors={[HC.green, HC.greenLt]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.xpFill}
                />
              </Animated.View>
            </View>
            <View style={styles.xpMeta}>
              <Text style={styles.xpMetaText}>3 400 XP</Text>
              <Text style={styles.xpMetaText}>800 avant le niveau 13</Text>
            </View>
          </View>

          <Pressable
            onPress={() => say(UNREAD_NOTIFICATIONS > 0 ? `🔔 ${UNREAD_NOTIFICATIONS} nouvelles notifications` : 'Aucune nouvelle notification')}
            onPressIn={notifPressIn}
            onPressOut={notifPressOut}
          >
            <Animated.View style={{ transform: [{ scale: notifScale }] }}>
              <LinearGradient colors={[HC.blueLt, HC.blue]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.notifBtn}>
                <MaterialCommunityIcons name="bell-outline" size={22} color="#fff" />
                {UNREAD_NOTIFICATIONS > 0 && (
                  <View style={styles.notifDot}>
                    <Text style={styles.notifDotText}>{UNREAD_NOTIFICATIONS}</Text>
                  </View>
                )}
              </LinearGradient>
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* STATUS: hearts + streak */}
        <Animated.View style={[styles.statusRow, riseStyle(headerA)]}>
          <View style={styles.heartsWrap}>
            {Array.from({ length: HEARTS_MAX }).map((_, i) => (
              <Text key={i} style={[styles.heart, i >= hearts && styles.heartOff]}>
                {i < hearts ? '❤️' : '🤍'}
              </Text>
            ))}
          </View>
          <View style={styles.streakWrap}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{STREAK_DAYS} jours de suite</Text>
          </View>
        </Animated.View>

        {/* QUICK LINKS: restores reach to Categories / Daily / Settings */}
        <Animated.View style={[styles.quickRow, riseStyle(headerA)]}>
          {QUICK_LINKS.map((q) => (
            <Pressable key={q.key} style={styles.quickItem} onPress={() => say(q.msg)}>
              <LinearGradient colors={q.bg as [string, string]} style={styles.quickBadge}>
                <Text style={styles.quickIcon}>{q.icon}</Text>
                {q.dot && <View style={styles.quickDot} />}
              </LinearGradient>
              <Text style={styles.quickLabel}>{q.label}</Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* HERO */}
        <Animated.View style={[styles.hero, riseStyle(heroA)]}>
          <Animated.View
            style={[
              styles.heroShadow,
              {
                transform: [
                  { scaleX: mascotBob.interpolate({ inputRange: [0, 1], outputRange: [1, 0.86] }) },
                ],
                opacity: mascotBob.interpolate({ inputRange: [0, 1], outputRange: [0.95, 0.65] }),
              },
            ]}
          />
          <Animated.View
            style={{
              transform: [
                { translateY: mascotBob.interpolate({ inputRange: [0, 1], outputRange: [0, -11] }) },
              ],
            }}
          >
            <Image source={mascots.brandMascot} style={styles.heroImg} contentFit="contain" />
          </Animated.View>
        </Animated.View>

        {/* START */}
        <Animated.View style={riseStyle(btnA)}>
          <Animated.View
            style={{
              transform: [{ scale: btnScale }],
              borderRadius: 24,
              shadowColor: HC.blue,
              shadowOffset: { width: 0, height: 8 },
              shadowRadius: btnGlow.interpolate({ inputRange: [0, 1], outputRange: [14, 24] }),
              shadowOpacity: btnGlow.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.6] }),
              elevation: 10,
            }}
          >
            <Pressable
              onPress={() =>
                hearts > 0
                  ? (navigation as any).navigate('Play')
                  : say('❤️ Plus de cœurs — recharge pour continuer à jouer')
              }
              onPressIn={pressIn}
              onPressOut={pressOut}
            >
              <LinearGradient
                colors={['#34E1F0', '#12A6F2', HC.blue]}
                locations={[0, 0.42, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.startBtn}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.sheen,
                    {
                      transform: [
                        { translateX: sheen.interpolate({ inputRange: [0, 1], outputRange: [-160, 420] }) },
                        { skewX: '-18deg' },
                      ],
                    },
                  ]}
                />
                <Text style={styles.startPlay}>▶</Text>
                <View>
                  <Text style={styles.startText}>Lancer le quiz</Text>
                  <Text style={styles.startSub}>Plonge dans une nouvelle manche</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </SafeAreaView>

      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      {!hasSeenStreakIntro && <StreakReveal days={STREAK_DAYS} onDone={markStreakIntroSeen} />}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  safe: { flex: 1, width: '100%', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, justifyContent: 'flex-start' },

  radialHighlight: { position: 'absolute', left: -60, top: -80, width: 340, height: 340, borderRadius: 170 },

  topbar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatarRing: {
    width: 58, height: 58, borderRadius: 29, padding: 3,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#142C78', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 16, elevation: 4,
  },
  avatarInner: {
    width: '100%', height: '100%', borderRadius: 26, backgroundColor: HC.blue, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarImg: { width: '100%', height: '100%' },
  lvlBadge: {
    position: 'absolute', bottom: -7, left: '50%', transform: [{ translateX: -20 }],
    backgroundColor: HC.red, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999,
    borderWidth: 2, borderColor: '#fff',
  },
  lvlText: { fontFamily: HF.dispBold, fontSize: 10, color: '#fff' },
  who: { flex: 1, minWidth: 0 },
  hi: { fontFamily: HF.bodyExtra, fontSize: 11, color: HC.inkSoft, letterSpacing: 0.3 },
  name: { fontFamily: HF.dispBold, fontSize: 21, color: '#fff' },
  xpTrack: {
    height: 11, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.6)', overflow: 'hidden', marginTop: 6,
  },
  xpFill: {
    width: '100%', height: '100%', borderRadius: 999,
    shadowColor: HC.green, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 6,
  },
  xpMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 3 },
  xpMetaText: { fontFamily: HF.bodyExtra, fontSize: 9.5, color: 'rgba(255,255,255,0.85)' },
  notifBtn: {
    width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#142C78', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 14, elevation: 5,
  },
  notifDot: {
    position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 3,
    backgroundColor: HC.red, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  notifDotText: { fontFamily: HF.bodyExtra, fontSize: 9.5, color: '#fff' },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 14,
    marginTop: 12,
  },
  heartsWrap: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 15 },
  heartOff: { opacity: 0.35 },
  streakWrap: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  streakIcon: { fontSize: 15 },
  streakText: { fontFamily: HF.bodyExtra, fontSize: 11.5, color: '#fff' },

  quickRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 },
  quickItem: { alignItems: 'center', gap: 6 },
  quickBadge: {
    width: 50, height: 50, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#142C78', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 10, elevation: 3,
  },
  quickIcon: { fontSize: 22 },
  quickDot: {
    position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6,
    backgroundColor: HC.red, borderWidth: 2, borderColor: '#fff',
  },
  quickLabel: { fontFamily: HF.bodyExtra, fontSize: 10, color: '#fff' },

  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroShadow: {
    position: 'absolute', bottom: '18%', width: 130, height: 20, borderRadius: 999,
    backgroundColor: 'rgba(14,28,86,0.36)',
  },
  heroImg: { width: 190, height: 190 },

  startBtn: {
    marginTop: 18, marginBottom: 8, borderRadius: 24, padding: 18, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center', gap: 12, overflow: 'hidden',
  },
  sheen: {
    position: 'absolute', top: -40, bottom: -40, width: 60,
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  startPlay: { fontSize: 20, color: '#fff' },
  startText: {
    fontFamily: HF.dispBold, fontSize: 20, color: '#fff',
    textShadowColor: 'rgba(0,40,120,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 6,
  },
  startSub: { fontFamily: HF.bodyExtra, fontSize: 11, color: 'rgba(255,255,255,0.85)' },

  toast: {
    position: 'absolute', left: '50%', bottom: 32, transform: [{ translateX: -120 }],
    width: 240, backgroundColor: 'rgba(15,35,80,0.92)', borderRadius: 14, paddingVertical: 11,
    paddingHorizontal: 16,
  },
  toastText: { fontFamily: HF.bodyExtra, fontSize: 13, color: '#fff', textAlign: 'center' },
});
