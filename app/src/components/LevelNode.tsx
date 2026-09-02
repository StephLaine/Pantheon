import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing } from 'react-native';
import { colors, fonts, toRoman } from '../theme';
import { LockIcon, ChestIcon } from './icons';
import IslandToken, { TOKEN_ASPECT, TOKEN_TOP_CENTER_RATIO } from './IslandToken';
import { chapterFor, type LevelInfo } from '../data/pantheon';

interface Props {
  level: LevelInfo;
  x: number;
  y: number;
  shape: 'a' | 'b' | 'c'; // kept for API compatibility with the map's scatter pattern
  onPress: (level: LevelInfo) => void;
}

export default function LevelNode({ level, x, y, onPress }: Props) {
  const isCurrent = level.state === 'current';
  const width = isCurrent ? 92 : level.isReward ? 96 : 76;
  const height = width * TOKEN_ASPECT;
  const topCenter = height * TOKEN_TOP_CENTER_RATIO;

  const pulse = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const mountA = useRef(new Animated.Value(0)).current;
  const floatVal = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isCurrent) return;
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    const bobLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    pulseLoop.start();
    bobLoop.start();
    return () => {
      pulseLoop.stop();
      bobLoop.stop();
    };
  }, [isCurrent]);

  useEffect(() => {
    // staggered "rise into place" entrance, offset by level number so the path cascades in
    const enterDelay = Math.min((level.n % 26) * 35, 900);
    Animated.timing(mountA, {
      toValue: 1, duration: 420, delay: enterDelay, easing: Easing.out(Easing.back(1.3)), useNativeDriver: true,
    }).start();

    // gentle perpetual float, out of phase per-island so the whole path doesn't bob in unison
    const floatDuration = 1500 + (level.n % 5) * 220;
    const floatDelay = (level.n % 7) * 90;
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(floatVal, { toValue: 1, duration: floatDuration, delay: floatDelay, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatVal, { toValue: 0, duration: floatDuration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    floatLoop.start();
    return () => floatLoop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pressIn() {
    Animated.spring(pressScale, { toValue: 0.92, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
  }
  function pressOut() {
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 8 }).start();
  }

  const isLocked = level.state === 'locked';
  const variant = isLocked ? 'locked' : 'unlocked';
  // every unlocked level keeps its own chapter's gem color (matching the source
  // level_node_hermes.svg's blue center) — only locked levels turn to muted stone
  const topColor = isLocked ? undefined : chapterFor(level.n).color;

  let badge: React.ReactNode = null;
  if (level.state === 'locked') {
    badge = <LockIcon size={14} color="#5B5648" />;
  } else if (level.isReward) {
    badge = <ChestIcon size={16} />;
  }

  const ringW = width * 0.74;
  const ringH = height * 0.6;
  const floatAmplitude = level.state === 'locked' ? 2.5 : isCurrent ? 5 : 4;

  return (
    <Animated.View
      style={[
        styles.node,
        { left: x - width / 2, top: y - topCenter, width, height },
        {
          opacity: mountA,
          transform: [
            { translateY: mountA.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) },
            { translateY: floatVal.interpolate({ inputRange: [0, 1], outputRange: [0, -floatAmplitude] }) },
            { scale: mountA.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
            { scale: pressScale },
          ],
        },
      ]}
    >
      {isCurrent && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.ring,
            {
              width: ringW,
              height: ringH,
              left: width / 2 - ringW / 2,
              top: topCenter - ringH / 2,
              opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.85] }),
              transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.12] }) }],
            },
          ]}
        />
      )}

      {isCurrent && (
        <Animated.View
          style={[
            styles.playchip,
            { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -5] }) }] },
          ]}
        >
          <Text style={styles.playchipText}>ENTRER · NIVEAU {toRoman(level.n)}</Text>
        </Animated.View>
      )}

      <Pressable onPress={() => onPress(level)} onPressIn={pressIn} onPressOut={pressOut} style={{ width, height }}>
        <IslandToken uid={level.n} width={width} variant={variant} topColor={topColor} />
        <View style={[styles.iconWrap, { left: width / 2 - 16, top: topCenter - 16 }]}>
          <Text style={[styles.numeral, { fontSize: isCurrent ? 20 : 16 }]}>{level.n}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { left: width / 2 + width * 0.18, top: topCenter + height * 0.14 }]}>
            {badge}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  node: { position: 'absolute', alignItems: 'center' },
  ring: {
    position: 'absolute', borderRadius: 999, borderWidth: 3, borderColor: 'rgba(255,201,60,0.55)',
  },
  playchip: {
    position: 'absolute', top: -30, backgroundColor: colors.marble, paddingHorizontal: 13, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, borderColor: colors.goldDp, zIndex: 5,
  },
  playchipText: { fontFamily: fonts.dispSemi, fontSize: 10.5, color: colors.bronzeDk, letterSpacing: 0.4 },
  iconWrap: { position: 'absolute', width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  numeral: {
    fontFamily: fonts.disp, color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 },
  },
  badge: {
    position: 'absolute', width: 22, height: 22, borderRadius: 11, backgroundColor: colors.marble,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.15)',
    shadowColor: '#0A0520', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3, elevation: 3,
  },
});
