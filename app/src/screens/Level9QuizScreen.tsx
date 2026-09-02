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
  WRONG_MASCOTS,
  TIMEOUT_MASCOTS,
  pick,
} from '../data/taunts';
import { useMascotTaunt } from '../components/MascotTaunt';
import { STORY } from '../data/story';
import { playSfx, playMusic, stopMusic, playStinger, startTimerTick, stopTimerTick } from '../audio/sound';
import { useGameStore, HEARTS_MAX } from '../state/game';

const story = STORY[9];

// mockup-only question bank — frontend flow for Level 9 (Hermes' Trailhead,
// "🧱 MUR 2 · Le Seuil"): sudden death. Survive 5 questions in a row; ONE
// wrong answer or timeout ends the attempt, costs a heart, and restarts from
// question 1 (map progress itself is untouched). The free 50/50 earned at
// Level 7 becomes usable here — its actual moment, per
// kwizkach_gameplay_niveaux.md. Hitting 0 hearts mid-run freezes into the
// same shop pattern as the Level 6 wall.
const QUESTIONS = [
  { prompt: 'Combien de côtés un carré a-t-il ?', choices: ['3', '4', '5', '6'], correct: 1 },
  { prompt: 'Quelles couleurs compose le drapeau haïtien ?', choices: ['Rouge et bleu', 'Vert et blanc', 'Noir et jaune', 'Bleu et blanc'], correct: 0 },
  { prompt: 'Combien font 10 − 4 ?', choices: ['5', '6', '7', '8'], correct: 1 },
  { prompt: "Quel est le premier mois de l'année ?", choices: ['Décembre', 'Janvier', 'Février', 'Mars'], correct: 1 },
  { prompt: 'Combien de roues une bicyclette a-t-elle ?', choices: ['1', '2', '3', '4'], correct: 1 },
];

const QUESTION_TIME = 8; // seconds — chrono serré, le 2e mur
const START_HEARTS = 3;
const START_COINS = 240;
const SKIP_COST = 20;

type Phase = 'question' | 'feedback' | 'frozen' | 'complete';

export default function Level9QuizScreen() {
  const navigation = useNavigation();

  const [showTutorial, setShowTutorial] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeartStore = useGameStore((s) => s.loseHeart);
  const setHeartsStore = useGameStore((s) => s.setHearts);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const [coins, setCoins] = useState(START_COINS);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(false);
  const [eliminated, setEliminated] = useState<number[]>([]);
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
    playMusic('mur');
    return stopMusic;
  }, []);

  useEffect(() => {
    if (showTutorial || phase === 'frozen') return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, showTutorial]);

  function loseHeart(): boolean {
    const next = loseHeartStore();
    return next === 0;
  }

  function failAttempt(willFreeze: boolean) {
    if (willFreeze) {
      setPhase('frozen');
      return;
    }
    // "le niveau se rejoue" — back to question 1, this attempt's progress reset
    setQIndex(0);
    setSelected(null);
    setEliminated([]);
    setPhase('question');
  }

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    playSfx('heartLose');
    const willFreeze = loseHeart();
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · le seuil se referme, −1 ❤️`, pick(TIMEOUT_MASCOTS), 1300);
    playSfx('chainBreak');
    setTimeout(() => failAttempt(willFreeze), 1300);
  }

  function onAnswer(i: number) {
    if (phase !== 'question') return;
    clearTimer();
    setSelected(i);
    setPhase('feedback');
    playSfx('select');
    const isCorrect = i === question.correct;
    if (isCorrect) {
      playSfx('correct');
      showTaunt('⚡ Bonne réponse !', mascots.correct, 700);
      setTimeout(() => {
        if (isLast) {
          setPhase('complete');
          completeLevel(9);
          stopMusic();
          playSfx('confetti');
          playStinger('acte2');
          confettiRef.current?.start();
        } else {
          setQIndex((q) => q + 1);
          setSelected(null);
          setEliminated([]);
          setPhase('question');
        }
      }, 700);
    } else {
      playSfx('wrong');
      playSfx('heartLose');
      const willFreeze = loseHeart();
      showTaunt(`${pick(WRONG_TAUNTS)} · le seuil se referme, −1 ❤️`, pick(WRONG_MASCOTS), 1300);
      playSfx('chainBreak');
      setTimeout(() => failAttempt(willFreeze), 1300);
    }
  }

  function useFiftyFifty() {
    if (fiftyFiftyUsed || phase !== 'question') return;
    playSfx('tap');
    const wrongIndices = question.choices.map((_, i) => i).filter((i) => i !== question.correct);
    const shuffled = [...wrongIndices].sort(() => Math.random() - 0.5);
    setEliminated(shuffled.slice(0, 2));
    setFiftyFiftyUsed(true);
    showTaunt('🍀 Hermès écarte deux fausses pistes.', mascots.winkThumbsUp, 1200);
  }

  function payToSkip() {
    playSfx('tap');
    playSfx('coinsPay');
    setCoins((c) => Math.max(0, c - SKIP_COST));
    setPhase('complete');
    completeLevel(9);
    stopMusic();
    playSfx('confetti');
    playStinger('acte2');
    confettiRef.current?.start();
  }

  function buyHearts() {
    playSfx('tap');
    setHeartsStore(HEARTS_MAX);
    setQIndex(0);
    setSelected(null);
    setEliminated([]);
    setPhase('question');
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
                <Text style={styles.topbarTitle}>🧱 Niveau {toRoman(9)} · Le Seuil</Text>
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

            <View style={styles.timerTrack}>
              <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
            </View>

            <View style={styles.body}>
              <View style={styles.card}>
                <Text style={styles.prompt}>{question.prompt}</Text>
              </View>

              <View style={styles.choices}>
                {question.choices.map((choice, i) => {
                  const isOut = eliminated.includes(i);
                  const isSelected = selected === i;
                  const isCorrectChoice = i === question.correct;
                  const revealed = phase === 'feedback';
                  const showCorrect = revealed && isCorrectChoice;
                  const showWrong = revealed && isSelected && !isCorrectChoice;
                  return (
                    <Pressable
                      key={i}
                      disabled={phase !== 'question' || isOut}
                      onPress={() => onAnswer(i)}
                      style={[
                        styles.choiceBtn,
                        isOut && styles.choiceOut,
                        showCorrect && styles.choiceCorrect,
                        showWrong && styles.choiceWrong,
                      ]}
                    >
                      <View style={styles.choiceBadge}>
                        <Text style={styles.choiceBadgeTxt}>{['A', 'B', 'C', 'D'][i]}</Text>
                      </View>
                      <Text style={styles.choiceTxt}>{isOut ? '—' : choice}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                style={[styles.fiftyBtn, fiftyFiftyUsed && styles.fiftyBtnUsed]}
                onPress={useFiftyFifty}
                disabled={fiftyFiftyUsed || phase !== 'question'}
              >
                <Text style={styles.fiftyTxt}>{fiftyFiftyUsed ? '🍀 50/50 utilisé' : '🍀 50/50 · offert au niveau 7'}</Text>
              </Pressable>
            </View>

            {tauntBubble}
          </>
        )}

        {phase === 'complete' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.readyToPlay} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>🏛️ Le Seuil est franchi !</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>{hearts} ❤️ restants · {coins} 🪙</Text>
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
            <Image source={mascots.determined} style={styles.tutorialMascot} contentFit="contain" />
            <Text style={styles.tutorialTitle}>{story.title}</Text>
            <Text style={styles.storyIntro}>{story.intro}</Text>
            <Text style={styles.tutorialLine}>⚠️ Une seule erreur met fin à la tentative !</Text>
            <Text style={styles.tutorialLine}>Survis à 5 questions d'affilée pour franchir le seuil.</Text>
            <Text style={styles.tutorialLine}>🍀 Ton 50/50 gratuit du niveau 7 est utilisable ici.</Text>
            <Pressable style={styles.tutorialBtn} onPress={dismissTutorial}>
              <Text style={styles.tutorialBtnTxt}>Compris !</Text>
            </Pressable>
          </View>
        </View>
      )}

      {phase === 'frozen' && (
        <View style={styles.tutorialOverlay}>
          <View style={styles.tutorialCard}>
            <Image source={mascots.defeat} style={styles.tutorialMascot} contentFit="contain" />
            <Text style={styles.tutorialTitle}>Plus de cœurs...</Text>
            <Text style={styles.tutorialLine}>Le seuil reste fermé sans un peu d'aide.</Text>
            <Pressable style={styles.paywallOption} onPress={payToSkip}>
              <Text style={styles.paywallOptionTxt}>⏭️ Payer {SKIP_COST} 🪙 · Franchir le seuil</Text>
            </Pressable>
            <Pressable style={styles.paywallOptionAlt} onPress={buyHearts}>
              <Text style={styles.paywallOptionAltTxt}>❤️ Recharger 5 cœurs · 0,99 $</Text>
            </Pressable>
            <Pressable style={styles.paywallCancel} onPress={goBack}>
              <Text style={styles.paywallCancelTxt}>Retour à la carte</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ConfettiCannon
        ref={confettiRef}
        count={90}
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
  topbarTitle: { fontFamily: fonts.dispSemi, fontSize: 12, color: '#fff' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotDone: { backgroundColor: colors.goldLt },
  dotCurrent: { backgroundColor: '#fff' },
  heartsMini: { flexDirection: 'row', gap: 2, width: 34 * 3 },
  heartMini: { fontSize: 15 },
  heartMiniOff: { opacity: 0.25 },

  timerTrack: {
    height: 7, marginHorizontal: 14, marginTop: 12, borderRadius: 3.5,
    backgroundColor: 'rgba(0,0,0,0.22)', overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.red, borderRadius: 3.5 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 26 },
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
  choiceOut: { opacity: 0.35, ...shadow.sm },
  choiceCorrect: { borderColor: colors.green, backgroundColor: withAlpha(colors.green, 0.16) },
  choiceWrong: { borderColor: colors.red, backgroundColor: withAlpha(colors.red, 0.14) },
  choiceBadge: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.ink,
    alignItems: 'center', justifyContent: 'center',
  },
  choiceBadgeTxt: { fontFamily: fonts.dispSemi, fontSize: 13, color: colors.goldLt },
  choiceTxt: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 15, color: colors.ink },

  fiftyBtn: {
    marginTop: 18, alignSelf: 'center', backgroundColor: colors.cHermes,
    borderRadius: 999, paddingVertical: 10, paddingHorizontal: 20,
  },
  fiftyBtnUsed: { backgroundColor: 'rgba(0,0,0,0.2)' },
  fiftyTxt: { fontFamily: fonts.bodyExtra, fontSize: 12.5, color: '#fff' },

  completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  completeMascot: { width: 160, height: 160 },
  completeTitle: { fontFamily: fonts.disp, fontSize: 22, color: colors.ink, marginTop: 8, textAlign: 'center' },
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
  tutorialTitle: { fontFamily: fonts.disp, fontSize: 17, color: colors.bronzeDk, marginTop: 6, textAlign: 'center' },
  tutorialLine: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.ink, marginTop: 10, textAlign: 'center' },
  storyIntro: { fontFamily: fonts.bodyBold, fontSize: 12.5, fontStyle: 'italic', color: colors.inkSoft, marginTop: 8, textAlign: 'center', lineHeight: 18 },
  tutorialBtn: {
    marginTop: 20, backgroundColor: colors.cHermes, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: 34,
  },
  tutorialBtnTxt: { fontFamily: fonts.dispSemi, fontSize: 14, color: '#fff' },

  paywallOption: {
    marginTop: 18, width: '100%', backgroundColor: colors.cHermes, borderRadius: radii.md,
    paddingVertical: 13, alignItems: 'center',
  },
  paywallOptionTxt: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: '#fff' },
  paywallOptionAlt: {
    marginTop: 10, width: '100%', backgroundColor: withAlpha(colors.red, 0.12), borderRadius: radii.md,
    paddingVertical: 13, alignItems: 'center', borderWidth: 1, borderColor: withAlpha(colors.red, 0.3),
  },
  paywallOptionAltTxt: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: colors.red },
  paywallCancel: { marginTop: 14, paddingVertical: 6 },
  paywallCancelTxt: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
});
