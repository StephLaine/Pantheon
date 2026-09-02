import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ConfettiCannon from 'react-native-confetti-cannon';

import { colors, fonts, radii, shadow, toRoman } from '../theme';
import { withAlpha } from '../utils/color';
import { mascots } from '../assets';
import {
  WRONG_TAUNTS,
  TIMEOUT_TAUNTS,
  BETWEEN_TAUNTS,
  WRONG_MASCOTS,
  TIMEOUT_MASCOTS,
  BETWEEN_MASCOTS,
  BETWEEN_TAUNT_CHANCE,
  pick,
} from '../data/taunts';
import { useMascotTaunt } from '../components/MascotTaunt';
import { STORY } from '../data/story';
import { playSfx, playMusic, stopMusic, playStinger, startTimerTick, stopTimerTick } from '../audio/sound';
import { useGameStore } from '../state/game';

const story = STORY[3];

// mockup-only question bank — frontend flow for Level 3 (Hermes' Trailhead,
// "Le Messager"): 5 generic QCM, generous 20s timer, plus the skip button
// (1 free use, then costs coins) taught here per kwizkach_gameplay_niveaux.md.
const QUESTIONS = [
  { prompt: 'Combien de continents y a-t-il sur Terre ?', choices: ['5', '6', '7', '8'], correct: 2 },
  { prompt: 'Quelle est la monnaie utilisée en Haïti ?', choices: ['Le dollar', 'La gourde', "L'euro", 'Le peso'], correct: 1 },
  { prompt: 'Combien de jours compte une année bissextile ?', choices: ['364', '365', '366', '367'], correct: 2 },
  { prompt: 'Quel est le plus long fleuve du monde ?', choices: ['Le Nil', "L'Amazone", 'Le Yangzi', 'Le Mississippi'], correct: 0 },
  { prompt: 'Combien de côtés a un hexagone ?', choices: ['5', '6', '7', '8'], correct: 1 },
];

const QUESTION_TIME = 20; // seconds — généreux, comme les niveaux 1 et 2
const START_HEARTS = 3;
const START_COINS = 240;
const SKIP_COST = 20;

type Phase = 'question' | 'feedback' | 'complete';

export default function Level3QuizScreen() {
  const navigation = useNavigation();

  const [showTutorial, setShowTutorial] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeart = useGameStore((s) => s.loseHeart);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const [coins, setCoins] = useState(START_COINS);
  const [correctCount, setCorrectCount] = useState(0);
  const [freeSkipUsed, setFreeSkipUsed] = useState(false);
  const [showSkipPaywall, setShowSkipPaywall] = useState(false);
  const { showTaunt, bubble: tauntBubble } = useMascotTaunt();

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  const question = QUESTIONS[qIndex];
  const isLast = qIndex === QUESTIONS.length - 1;

  function startTimer() {
    timerAnim.setValue(1);
    Animated.timing(timerAnim, {
      toValue: 0,
      duration: QUESTION_TIME * 1000,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
    timerRef.current = setTimeout(() => onTimeout(), QUESTION_TIME * 1000);
    startTimerTick();
  }

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerAnim.stopAnimation();
    stopTimerTick();
  }

  useEffect(() => {
    playMusic('routeSacree');
    return stopMusic;
  }, []);

  useEffect(() => {
    if (showTutorial) return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, showTutorial]);

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · pas de cœur perdu`, pick(TIMEOUT_MASCOTS), 1400);
    setTimeout(advance, 1400);
  }

  function onAnswer(i: number) {
    if (phase !== 'question') return;
    clearTimer();
    setSelected(i);
    setPhase('feedback');
    playSfx('select');
    const isCorrect = i === question.correct;
    if (isCorrect) {
      setCorrectCount((c) => c + 1);
      playSfx('correct');
      showTaunt('⚡ Bonne réponse !', mascots.correct, 900);
      setTimeout(advance, 900);
    } else {
      loseHeart();
      playSfx('wrong');
      playSfx('heartLose');
      showTaunt(`${pick(WRONG_TAUNTS)} · −1 ❤️`, pick(WRONG_MASCOTS), 1300);
      setTimeout(advance, 1300);
    }
  }

  function onSkipPress() {
    if (phase !== 'question') return;
    if (!freeSkipUsed) {
      playSfx('tap');
      performSkip(false);
    } else {
      setShowSkipPaywall(true);
    }
  }

  function cancelSkipPaywall() {
    playSfx('tap');
    setShowSkipPaywall(false);
  }

  function payForSkip() {
    playSfx('tap');
    playSfx('coinsPay');
    performSkip(true);
  }

  function performSkip(paid: boolean) {
    clearTimer();
    setShowSkipPaywall(false);
    if (!freeSkipUsed) setFreeSkipUsed(true);
    if (paid) setCoins((c) => Math.max(0, c - SKIP_COST));
    setSelected(null);
    setPhase('feedback');
    showTaunt(
      paid ? '⏭️ Message envoyé — 20 🪙 dépensées' : '⏭️ Hermès porte ta question ailleurs...',
      mascots.winkThumbsUp,
      900,
    );
    setTimeout(advance, 900);
  }

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 2200);
  }

  function advance() {
    if (isLast) {
      setPhase('complete');
      completeLevel(3);
      stopMusic();
      playSfx('confetti');
      playStinger('acte1');
      confettiRef.current?.start();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setPhase('question');
      maybeShowBetweenTaunt();
    }
  }

  function dismissTutorial() {
    playSfx('tap');
    setShowTutorial(false);
  }

  function goBack() {
    playSfx('tap');
    navigation.goBack();
  }

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.skyTop, colors.skyMid, colors.skyBottom]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {phase !== 'complete' && (
          <>
            <View style={styles.topbar}>
              <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
                <Text style={styles.backTxt}>‹</Text>
              </Pressable>
              <View style={styles.topbarCenter}>
                <Text style={styles.topbarTitle}>Niveau {toRoman(3)} · Le Messager</Text>
                <View style={styles.dots}>
                  {QUESTIONS.map((_, i) => (
                    <View key={i} style={[styles.dot, i < qIndex && styles.dotDone, i === qIndex && styles.dotCurrent]} />
                  ))}
                </View>
              </View>
              <View style={styles.heartsMini}>
                {Array.from({ length: START_HEARTS }).map((_, i) => (
                  <Text key={i} style={[styles.heartMini, i >= hearts && styles.heartMiniOff]}>
                    ❤️
                  </Text>
                ))}
              </View>
            </View>

            <View style={styles.coinRow}>
              <Text style={styles.coinTxt}>🪙 {coins}</Text>
            </View>

            <View style={styles.timerTrack}>
              <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
            </View>

            <View style={styles.body}>
              <View style={styles.card}>
                <Text style={styles.prompt}>{question.prompt}</Text>
              </View>

              <View style={styles.choices}>
                {question.choices.map((choice, i) => {
                  const isSelected = selected === i;
                  const isCorrectChoice = i === question.correct;
                  const revealed = phase === 'feedback';
                  const showCorrect = revealed && isCorrectChoice;
                  const showWrong = revealed && isSelected && !isCorrectChoice;
                  return (
                    <Pressable
                      key={i}
                      disabled={phase !== 'question'}
                      onPress={() => onAnswer(i)}
                      style={[styles.choiceBtn, showCorrect && styles.choiceCorrect, showWrong && styles.choiceWrong]}
                    >
                      <View style={styles.choiceBadge}>
                        <Text style={styles.choiceBadgeTxt}>{['A', 'B', 'C', 'D'][i]}</Text>
                      </View>
                      <Text style={styles.choiceTxt}>{choice}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable style={styles.skipBtn} onPress={onSkipPress} disabled={phase !== 'question'}>
                <Text style={styles.skipTxt}>
                  ⏭️ Message d'Hermès{!freeSkipUsed ? ' · gratuit' : ` · ${SKIP_COST} 🪙`}
                </Text>
              </Pressable>
            </View>

            {tauntBubble}
          </>
        )}

        {phase === 'complete' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.cheering} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>Borne 3 franchie !</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>
              {correctCount}/{QUESTIONS.length} bonnes réponses · {hearts} ❤️ restants · {coins} 🪙
            </Text>
            <Pressable style={styles.completeBtn} onPress={goBack}>
              <LinearGradient colors={[colors.goldLt, colors.gold, colors.goldDp]} style={StyleSheet.absoluteFill} />
              <Text style={styles.completeBtnTxt}>Retour à la carte</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>

      {showTutorial && (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Image source={mascots.tutorialPointing} style={styles.tutorialMascot} contentFit="contain" />
            <Text style={styles.tutorialTitle}>{story.title}</Text>
            <Text style={styles.storyIntro}>{story.intro}</Text>
            <Text style={styles.tutorialLine}>⏭️ Bloqué ? Hermès porte ta question ailleurs.</Text>
            <Text style={styles.tutorialLine}>Un « Message d'Hermès » gratuit t'attend !</Text>
            <Pressable style={styles.tutorialBtn} onPress={dismissTutorial}>
              <Text style={styles.tutorialBtnTxt}>Compris !</Text>
            </Pressable>
          </View>
        </View>
      )}

      {showSkipPaywall && (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Image source={mascots.winkThumbsUp} style={styles.tutorialMascot} contentFit="contain" />
            <Text style={styles.tutorialTitle}>Encore un message ?</Text>
            <Text style={styles.tutorialLine}>Ton premier message était gratuit. Celui-ci coûte 20 🪙.</Text>
            <View style={styles.paywallRow}>
              <Pressable style={styles.paywallCancel} onPress={cancelSkipPaywall}>
                <Text style={styles.paywallCancelTxt}>Annuler</Text>
              </Pressable>
              <Pressable style={styles.paywallPay} onPress={payForSkip}>
                <Text style={styles.paywallPayTxt}>Payer 20 🪙</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      <ConfettiCannon
        ref={confettiRef}
        count={80}
        origin={{ x: 210, y: 0 }}
        autoStart={false}
        fadeOut
        colors={[colors.goldLt, colors.gold, colors.goldDp, '#ffffff']}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  safe: { flex: 1 },

  topbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 6, gap: 10 },
  backBtn: {
    width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  backTxt: { color: '#fff', fontSize: 22, fontFamily: fonts.bodyBold, marginTop: -2 },
  topbarCenter: { flex: 1, alignItems: 'center' },
  topbarTitle: { fontFamily: fonts.dispSemi, fontSize: 13, color: '#fff' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotDone: { backgroundColor: colors.goldLt },
  dotCurrent: { backgroundColor: '#fff' },
  heartsMini: { flexDirection: 'row', gap: 2, width: 34 * 3 },
  heartMini: { fontSize: 15 },
  heartMiniOff: { opacity: 0.25 },

  coinRow: { alignSelf: 'center', marginTop: 6 },
  coinTxt: { fontFamily: fonts.bodyExtra, fontSize: 12, color: colors.goldLt },

  timerTrack: {
    height: 6, marginHorizontal: 14, marginTop: 10, borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.cHermes, borderRadius: 3 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.lg, padding: 22,
    minHeight: 120, alignItems: 'center', justifyContent: 'center', ...shadow.md,
  },
  prompt: { fontFamily: fonts.dispSemi, fontSize: 18, color: colors.ink, textAlign: 'center', lineHeight: 25 },

  choices: { marginTop: 20, gap: 12 },
  choiceBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radii.md, paddingVertical: 14, paddingHorizontal: 16,
    borderWidth: 2, borderColor: 'transparent', ...shadow.sm,
  },
  choiceCorrect: { borderColor: colors.green, backgroundColor: withAlpha(colors.green, 0.16) },
  choiceWrong: { borderColor: colors.red, backgroundColor: withAlpha(colors.red, 0.14) },
  choiceBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceBadgeTxt: { fontFamily: fonts.dispSemi, fontSize: 13, color: colors.goldLt },
  choiceTxt: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },

  skipBtn: {
    marginTop: 18, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 999, paddingVertical: 9, paddingHorizontal: 18,
  },
  skipTxt: { fontFamily: fonts.bodyExtra, fontSize: 12.5, color: '#fff' },

  completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  completeMascot: { width: 160, height: 160 },
  completeTitle: { fontFamily: fonts.disp, fontSize: 24, color: colors.ink, marginTop: 8, textAlign: 'center' },
  completeSub: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, marginTop: 8, textAlign: 'center' },
  storyOutro: { fontFamily: fonts.bodyBold, fontSize: 13, fontStyle: 'italic', color: colors.inkSoft, marginTop: 10, textAlign: 'center', lineHeight: 18 },
  completeBtn: {
    marginTop: 28, width: '100%', borderRadius: radii.md, paddingVertical: 16,
    alignItems: 'center', overflow: 'hidden', ...shadow.md,
  },
  completeBtnTxt: { fontFamily: fonts.dispSemi, fontSize: 15, color: colors.bronzeDk },

  tutorialOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(10,8,25,0.6)', alignItems: 'center', justifyContent: 'center', padding: 30,
  },
  tutorialCard: {
    width: '100%', backgroundColor: colors.marble, borderRadius: radii.lg, padding: 24,
    alignItems: 'center', ...shadow.lg,
  },
  tutorialMascot: { width: 90, height: 90 },
  tutorialTitle: { fontFamily: fonts.disp, fontSize: 18, color: colors.bronzeDk, marginTop: 6 },
  tutorialLine: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginTop: 10, textAlign: 'center' },
  storyIntro: { fontFamily: fonts.bodyBold, fontSize: 12.5, fontStyle: 'italic', color: colors.inkSoft, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  tutorialBtn: {
    marginTop: 20, backgroundColor: colors.cHermes, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: 34,
  },
  tutorialBtnTxt: { fontFamily: fonts.dispSemi, fontSize: 14, color: '#fff' },

  paywallRow: { flexDirection: 'row', gap: 12, marginTop: 20, width: '100%' },
  paywallCancel: {
    flex: 1, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  paywallCancelTxt: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft },
  paywallPay: {
    flex: 1, borderRadius: radii.md, paddingVertical: 13, alignItems: 'center',
    backgroundColor: colors.cHermes,
  },
  paywallPayTxt: { fontFamily: fonts.dispSemi, fontSize: 14, color: '#fff' },
});
