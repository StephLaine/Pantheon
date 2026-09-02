import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';

import { colors, fonts, radii, shadow } from '../theme';
import { playSfx } from '../audio/sound';

// one floating mascot bubble drives every kind of level commentary (correct,
// wrong, timeout, idle chatter) — fixed position so it never shifts the quiz
// layout, a spring pop-in + gentle idle bob while visible, then a pop-out.
export function useMascotTaunt() {
  const [content, setContent] = useState<{ text: string; mascot: any } | null>(null);
  const pop = useRef(new Animated.Value(0)).current;
  const bob = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bobLoop = useRef<Animated.CompositeAnimation | null>(null);

  function showTaunt(text: string, mascot: any, holdMs: number) {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    bobLoop.current?.stop();

    setContent({ text, mascot });
    playSfx('mascotPop');
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();

    bob.setValue(0);
    bobLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0, duration: 480, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    bobLoop.current.start();

    hideTimer.current = setTimeout(() => {
      bobLoop.current?.stop();
      Animated.timing(pop, { toValue: 0, duration: 200, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => setContent(null));
    }, holdMs);
  }

  const bubble = content ? (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.float,
        {
          opacity: pop,
          transform: [
            { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) },
            { translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) },
          ],
        },
      ]}
    >
      <View style={styles.speech}>
        <Text style={styles.txt}>{content.text}</Text>
        <View style={styles.tail} />
      </View>
      <Image source={content.mascot} style={styles.mascot} contentFit="contain" />
    </Animated.View>
  ) : null;

  return { showTaunt, bubble };
}

const styles = StyleSheet.create({
  float: {
    position: 'absolute', left: 16, right: 16, bottom: 30,
    flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 8,
  },
  speech: {
    flex: 1, maxWidth: 260, backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: radii.md,
    paddingVertical: 10, paddingHorizontal: 14, marginBottom: 12, ...shadow.md,
  },
  txt: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink },
  tail: {
    position: 'absolute', right: 20, bottom: -7, width: 0, height: 0,
    borderLeftWidth: 7, borderRightWidth: 7, borderTopWidth: 9,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: 'rgba(255,255,255,0.96)',
  },
  mascot: { width: 60, height: 60 },
});
