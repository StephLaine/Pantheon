import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { mascots } from '../assets';
import { colors, radii, shadow } from '../theme';
import { HC, HF } from '../theme/home';
import { playSfx } from '../audio/sound';

interface Props {
  days: number;
  onDone: () => void;
}

// full-screen, one-time "streak" moment — meant to be the very first thing a
// player sees on Home: dark fire-lit backdrop, mascot springs in with an
// impact flash, the day count ticks up, then a subtitle + CTA settle in.
// Dismissing plays the whole thing in reverse (shrink + fade) before onDone.
export default function StreakReveal({ days, onDone }: Props) {
  const backdrop = useRef(new Animated.Value(0)).current;
  const mascotPop = useRef(new Animated.Value(0)).current;
  const exitScale = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const subtitleA = useRef(new Animated.Value(0)).current;
  const buttonA = useRef(new Animated.Value(0)).current;

  const [displayCount, setDisplayCount] = useState(0);
  const [dismissing, setDismissing] = useState(false);

  // randomized once — a handful of embers drifting up past the mascot, each on
  // its own loop so they never look synchronized
  const embers = useMemo(
    () =>
      Array.from({ length: 12 }, () => ({
        x: (Math.random() - 0.5) * 220,
        size: 3 + Math.random() * 5,
        delay: Math.random() * 1800,
        duration: 2000 + Math.random() * 1400,
        drive: new Animated.Value(0),
      })),
    [],
  );

  useEffect(() => {
    Animated.timing(backdrop, { toValue: 1, duration: 320, easing: Easing.out(Easing.ease), useNativeDriver: true }).start();
    playSfx('streakWhoosh');

    Animated.spring(mascotPop, {
      toValue: 1, friction: 4.5, tension: 120, delay: 220, useNativeDriver: true,
    }).start();

    Animated.sequence([
      Animated.delay(560),
      Animated.timing(flash, { toValue: 1, duration: 70, useNativeDriver: true }),
      Animated.timing(flash, { toValue: 0, duration: 260, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
    setTimeout(() => playSfx('streakImpact'), 560);

    Animated.timing(countAnim, {
      toValue: days, duration: 750, delay: 620, easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start(() => playSfx('streakChime'));

    Animated.timing(subtitleA, { toValue: 1, duration: 400, delay: 1050, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    Animated.timing(buttonA, { toValue: 1, duration: 420, delay: 1250, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

    const ringLoop = (v: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: 1600, delay, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      );
    const r1 = ringLoop(ring1, 0);
    const r2 = ringLoop(ring2, 800);
    r1.start();
    r2.start();

    const emberLoops = embers.map((e) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(e.drive, { toValue: 1, duration: e.duration, delay: e.delay, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(e.drive, { toValue: 0, duration: 0, useNativeDriver: true }),
        ]),
      ),
    );
    emberLoops.forEach((l) => l.start());

    let lastTicked = 0;
    const id = countAnim.addListener(({ value }) => {
      const rounded = Math.round(value);
      setDisplayCount(rounded);
      if (rounded > lastTicked) {
        lastTicked = rounded;
        playSfx('streakTick');
      }
    });
    return () => {
      r1.stop();
      r2.stop();
      emberLoops.forEach((l) => l.stop());
      countAnim.removeListener(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleContinue() {
    if (dismissing) return;
    playSfx('tap');
    setDismissing(true);
    Animated.parallel([
      Animated.timing(exitScale, { toValue: 0.86, duration: 240, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdrop, { toValue: 0, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onDone());
  }

  const mascotScale = mascotPop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.3, 1.08, 1] });
  const mascotY = mascotPop.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] });

  return (
    <Animated.View style={[styles.root, { opacity: backdrop }]} pointerEvents={dismissing ? 'none' : 'auto'}>
      <LinearGradient colors={['#120A08', '#2B120A', '#120A08']} style={StyleSheet.absoluteFill} />
      <View style={styles.glowWrap} pointerEvents="none">
        <LinearGradient
          colors={['rgba(255,152,0,0.55)', 'rgba(255,152,0,0)']}
          style={styles.glow}
        />
      </View>

      {[ring1, ring2].map((r, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.ring,
            {
              opacity: r.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] }),
              transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.5] }) }],
            },
          ]}
        />
      ))}

      {embers.map((e, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.ember,
            {
              width: e.size,
              height: e.size,
              borderRadius: e.size / 2,
              opacity: e.drive.interpolate({ inputRange: [0, 0.15, 0.8, 1], outputRange: [0, 0.9, 0.4, 0] }),
              transform: [
                { translateX: e.x },
                { translateY: e.drive.interpolate({ inputRange: [0, 1], outputRange: [40, -340] }) },
              ],
            },
          ]}
        />
      ))}

      <Animated.View style={{ transform: [{ scale: exitScale }] }}>
        <Animated.View style={{ transform: [{ scale: mascotScale }, { translateY: mascotY }] }}>
          <Image source={mascots.streak} style={styles.mascot} contentFit="contain" />
        </Animated.View>

        <View style={styles.countRow}>
          <Text style={styles.fireIcon}>🔥</Text>
          <Text style={styles.count}>{displayCount}</Text>
        </View>
        <Text style={styles.label}>JOURS DE SUITE</Text>

        <Animated.Text
          style={[
            styles.subtitle,
            { opacity: subtitleA, transform: [{ translateY: subtitleA.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] },
          ]}
        >
          Reviens demain pour ne pas perdre ta série !
        </Animated.Text>

        <Animated.View
          style={{
            opacity: buttonA,
            transform: [{ translateY: buttonA.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
          }}
        >
          <Pressable onPress={handleContinue}>
            <LinearGradient colors={[colors.goldLt, colors.gold, colors.goldDp]} style={styles.btn}>
              <Text style={styles.btnText}>Continuer</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>

      <Animated.View pointerEvents="none" style={[styles.flash, { opacity: flash }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 50,
    alignItems: 'center', justifyContent: 'center',
  },
  glowWrap: { position: 'absolute', width: 460, height: 460, alignItems: 'center', justifyContent: 'center' },
  glow: { width: 460, height: 460, borderRadius: 230 },
  ring: {
    position: 'absolute', width: 220, height: 220, borderRadius: 110,
    borderWidth: 2.5, borderColor: HC.orange,
  },
  ember: { position: 'absolute', bottom: '38%', backgroundColor: colors.goldLt },
  mascot: { width: 190, height: 190, alignSelf: 'center' },
  countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 6 },
  fireIcon: { fontSize: 34 },
  count: {
    fontFamily: HF.dispBold, fontSize: 64, color: '#fff', lineHeight: 68,
    textShadowColor: 'rgba(255,120,0,0.7)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 18,
  },
  label: {
    fontFamily: HF.bodyExtra, fontSize: 14, color: colors.goldLt, letterSpacing: 2.5,
    textAlign: 'center', marginTop: 2,
  },
  subtitle: {
    fontFamily: HF.bodyBold, fontSize: 14, color: 'rgba(255,255,255,0.82)',
    textAlign: 'center', marginTop: 18, paddingHorizontal: 40,
  },
  btn: {
    marginTop: 26, paddingVertical: 15, paddingHorizontal: 56, borderRadius: radii.md,
    alignItems: 'center', ...shadow.md,
  },
  btnText: { fontFamily: HF.dispBold, fontSize: 16, color: colors.bronzeDk },
  flash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#fff' },
});
