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

const story = STORY[5];

// mockup-only question pool — frontend flow for Level 5 (Hermes' Trailhead,
// "L'Élan"): unlike levels 1-4, this isn't a fixed question count — the goal
// is a CHAIN of 3 correct answers in a row. Breaking the chain costs a heart
// and resets the streak to 0 but never ends the level ("version douce" per
// kwizkach_gameplay_niveaux.md); reaching a streak of 3 ends it in success.
// The pool loops (modulo) in the rare case a run needs more than 10 questions.
const QUESTION_POOL = [
  { prompt: "Combien de zéros y a-t-il dans un million ?", choices: ['4', '5', '6', '7'], correct: 2 },
  { prompt: 'Quelle est la plus grande planète du système solaire ?', choices: ['Terre', 'Mars', 'Jupiter', 'Saturne'], correct: 2 },
  { prompt: "Combien de lettres compte l'alphabet français ?", choices: ['24', '25', '26', '27'], correct: 2 },
  { prompt: "Quel est le symbole chimique de l'or ?", choices: ['Ag', 'Au', 'Fe', 'Pb'], correct: 1 },
  { prompt: 'Combien de cordes une guitare classique a-t-elle ?', choices: ['4', '5', '6', '7'], correct: 2 },
  { prompt: 'Quel est l\'animal terrestre le plus rapide ?', choices: ['Lion', 'Guépard', 'Cheval', 'Antilope'], correct: 1 },
  { prompt: "Combien de couleurs compte l'arc-en-ciel ?", choices: ['5', '6', '7', '8'], correct: 2 },
  { prompt: 'Quelle est la capitale du Canada ?', choices: ['Toronto', 'Montréal', 'Ottawa', 'Vancouver'], correct: 2 },
  { prompt: 'Combien de dents un adulte humain a-t-il en moyenne ?', choices: ['28', '30', '32', '34'], correct: 2 },
  { prompt: 'Quel est le plus petit pays du monde ?', choices: ['Monaco', 'Vatican', 'Malte', 'Andorre'], correct: 1 },
];

const QUESTION_TIME = 15; // seconds — chrono moyen (entre les 20s des niv. 1-3 et les 12s du niv. 4)
const START_HEARTS = 3;
const HEARTS_CAP = 3; // display cap — the level-5 reward can push the real count past this
const STREAK_GOAL = 3;

type Phase = 'question' | 'feedback' | 'complete';

export default function Level5QuizScreen() {
  const navigation = useNavigation();

  const [showTutorial, setShowTutorial] = useState(true);
  const [poolIndex, setPoolIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeart = useGameStore((s) => s.loseHeart);
  const gainHearts = useGameStore((s) => s.gainHearts);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const [streak, setStreak] = useState(0);
  const { showTaunt, bubble: tauntBubble } = useMascotTaunt();

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  const question = QUESTION_POOL[poolIndex % QUESTION_POOL.length];

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
  }, [poolIndex, showTutorial]);

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    if (streak > 0) {
      playSfx('chainBreak');
      playMusic('routeSacree');
    }
    setStreak(0); // a timeout isn't a "bonne réponse d'affilée" — the chain breaks, but stays free
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · élan brisé, pas de cœur perdu`, pick(TIMEOUT_MASCOTS), 1300);
    setTimeout(advance, 1300);
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
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      if (nextStreak === 1) {
        playSfx('chainPip1');
        playMusic('elan'); // first correct answer of a fresh chain — switch to the tension bed
      } else if (nextStreak === 2) {
        playSfx('chainPip2');
      } else if (nextStreak >= STREAK_GOAL) {
        playSfx('chainPip3');
      }
      if (nextStreak >= STREAK_GOAL) {
        showTaunt('⚡ Élan parfait !', mascots.jackpot, 1100);
        playSfx('confetti'); // heart-gain cue
        setTimeout(() => {
          gainHearts(1); // 🎁 1 cœur gratuit à la réussite
          setPhase('complete');
          completeLevel(5);
          stopMusic();
          playStinger('acte1');
          confettiRef.current?.start();
        }, 1100);
        return;
      }
      showTaunt(`⚡ Bonne réponse ! Élan ×${nextStreak}`, mascots.correct, 800);
      setTimeout(advance, 800);
    } else {
      loseHeart();
      playSfx('wrong');
      playSfx('heartLose');
      if (streak > 0) {
        playSfx('chainBreak');
        playMusic('routeSacree');
      }
      setStreak(0);
      showTaunt(`${pick(WRONG_TAUNTS)} · élan brisé, −1 ❤️`, pick(WRONG_MASCOTS), 1300);
      setTimeout(advance, 1300);
    }
  }

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 2000);
  }

  function advance() {
    setPoolIndex((i) => i + 1);
    setSelected(null);
    setPhase('question');
    maybeShowBetweenTaunt();
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
                <Text style={styles.topbarTitle}>Niveau {toRoman(5)} · L'Élan</Text>
              </View>
              <View style={styles.heartsMini}>
                {Array.from({ length: HEARTS_CAP }).map((_, i) => {
                  const filled = i < Math.min(hearts, HEARTS_CAP);
                  const isLast = i === HEARTS_CAP - 1;
                  return (
                    <View key={i}>
                      <Text style={[styles.heartMini, !filled && styles.heartMiniOff]}>❤️</Text>
                      {isLast && hearts > HEARTS_CAP && (
                        <View style={styles.heartBadge}>
                          <Text style={styles.heartBadgeTxt}>{hearts}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.streakRow}>
              <Text style={styles.streakLabel}>⚡ Élan ×{streak}</Text>
              <View style={styles.streakPips}>
                {Array.from({ length: STREAK_GOAL }).map((_, i) => (
                  <View key={i} style={[styles.pip, i < streak && styles.pipFilled]} />
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
            </View>

            {tauntBubble}
          </>
        )}

        {phase === 'complete' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.jackpot} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>Borne 5 franchie !</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>Élan de {STREAK_GOAL} réussi 🎁 +1 ❤️ · {hearts} ❤️ au total</Text>
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
            <Text style={styles.tutorialLine}>⚡ Enchaîne 3 bonnes réponses d'affilée !</Text>
            <Text style={styles.tutorialLine}>Une erreur = −1 ❤️ et l'élan repart de zéro... sans autre punition.</Text>
            <Pressable style={styles.tutorialBtn} onPress={dismissTutorial}>
              <Text style={styles.tutorialBtnTxt}>Compris !</Text>
            </Pressable>
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
  heartsMini: { flexDirection: 'row', gap: 2, width: 34 * 3 },
  heartMini: { fontSize: 15 },
  heartMiniOff: { opacity: 0.25 },
  heartBadge: {
    position: 'absolute', top: -5, right: -7, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: colors.red, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  heartBadgeTxt: { fontFamily: fonts.bodyExtra, fontSize: 8.5, color: '#fff' },

  streakRow: { alignItems: 'center', marginTop: 6, gap: 6 },
  streakLabel: { fontFamily: fonts.dispSemi, fontSize: 13, color: colors.goldLt },
  streakPips: { flexDirection: 'row', gap: 6 },
  pip: { width: 20, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.28)' },
  pipFilled: { backgroundColor: colors.goldLt },

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
});
