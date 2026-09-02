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

const story = STORY[2];

// mockup-only question banks — frontend flow for Level 2 (Hermes' Trailhead,
// "Le Carrefour"): pick one of 3 categories, then 5 QCM from that bank.
// Generous 20s timer, timeout costs nothing — same pacing as Level 1.
const CATEGORIES = [
  {
    key: 'sport',
    label: 'Sport',
    icon: '⚽',
    questions: [
      { prompt: 'Combien de joueurs une équipe de football aligne-t-elle sur le terrain ?', choices: ['9', '10', '11', '12'], correct: 2 },
      { prompt: "Tous les combien d'années ont lieu les Jeux Olympiques d'été ?", choices: ['2', '3', '4', '5'], correct: 2 },
      { prompt: 'Quel pays a remporté la Coupe du Monde de football 2018 ?', choices: ['Brésil', 'Allemagne', 'France', 'Argentine'], correct: 2 },
      { prompt: 'Dans quel sport utilise-t-on un « volant » (birdie) ?', choices: ['Golf', 'Tennis', 'Badminton', 'Squash'], correct: 2 },
      { prompt: 'Combien de temps dure un match de basket-ball NBA (hors prolongations) ?', choices: ['40 min', '48 min', '60 min', '90 min'], correct: 1 },
    ],
  },
  {
    key: 'histoire',
    label: 'Histoire',
    icon: '📜',
    questions: [
      { prompt: 'En quelle année a eu lieu la Révolution française ?', choices: ['1789', '1799', '1804', '1815'], correct: 0 },
      { prompt: 'Qui fut le premier empereur de Rome ?', choices: ['Jules César', 'Auguste', 'Néron', 'Trajan'], correct: 1 },
      { prompt: 'Quel mur est tombé en 1989 ?', choices: ['Le mur de Berlin', 'La Grande Muraille', "Le mur d'Hadrien", 'La muraille de Chine'], correct: 0 },
      { prompt: 'Quelle civilisation a construit les pyramides de Gizeh ?', choices: ['Grecque', 'Romaine', 'Égyptienne', 'Maya'], correct: 2 },
      { prompt: 'Qui a été le premier président des États-Unis ?', choices: ['Lincoln', 'Jefferson', 'Washington', 'Adams'], correct: 2 },
    ],
  },
  {
    key: 'sciences',
    label: 'Sciences',
    icon: '🔬',
    questions: [
      { prompt: "Quelle est la formule chimique de l'eau ?", choices: ['CO2', 'H2O', 'O2', 'NaCl'], correct: 1 },
      { prompt: 'Combien de planètes compte notre système solaire ?', choices: ['7', '8', '9', '10'], correct: 1 },
      { prompt: 'Quel organe pompe le sang dans le corps humain ?', choices: ['Poumon', 'Foie', 'Cœur', 'Rein'], correct: 2 },
      { prompt: 'Quelle est la vitesse de la lumière, arrondie ?', choices: ['300 000 km/s', '150 000 km/s', '3 000 km/s', '1 000 000 km/s'], correct: 0 },
      { prompt: 'Quel gaz les plantes absorbent-elles pour la photosynthèse ?', choices: ['Oxygène', 'Azote', 'CO2', 'Hydrogène'], correct: 2 },
    ],
  },
];

const QUESTION_TIME = 20; // seconds — généreux, comme le niveau 1
const START_HEARTS = 3;

type Phase = 'category' | 'question' | 'feedback' | 'complete';

export default function Level2QuizScreen() {
  const navigation = useNavigation();

  const [phase, setPhase] = useState<Phase>('category');
  const [categoryIndex, setCategoryIndex] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeart = useGameStore((s) => s.loseHeart);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const [correctCount, setCorrectCount] = useState(0);
  const { showTaunt, bubble: tauntBubble } = useMascotTaunt();

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  const category = categoryIndex !== null ? CATEGORIES[categoryIndex] : null;
  const questions = category?.questions ?? [];
  const question = questions[qIndex];
  const isLast = qIndex === questions.length - 1;

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
    if (phase !== 'question') return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase]);

  function chooseCategory(i: number) {
    playSfx('tap');
    setCategoryIndex(i);
    setPhase('question');
  }

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · pas de cœur perdu`, pick(TIMEOUT_MASCOTS), 1400);
    // Level 2: same generous pacing as Level 1 — timeout never costs a heart
    setTimeout(advance, 1400);
  }

  function onAnswer(i: number) {
    if (phase !== 'question' || !question) return;
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

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 2200);
  }

  function advance() {
    if (isLast) {
      setPhase('complete');
      completeLevel(2);
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

  function goBack() {
    playSfx('tap');
    navigation.goBack();
  }

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.skyTop, colors.skyMid, colors.skyBottom]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topbar}>
          <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
            <Text style={styles.backTxt}>‹</Text>
          </Pressable>
          <View style={styles.topbarCenter}>
            <Text style={styles.topbarTitle}>Niveau {toRoman(2)} · Le Carrefour</Text>
            {phase !== 'category' && (
              <View style={styles.dots}>
                {questions.map((_, i) => (
                  <View key={i} style={[styles.dot, i < qIndex && styles.dotDone, i === qIndex && styles.dotCurrent]} />
                ))}
              </View>
            )}
          </View>
          <View style={styles.heartsMini}>
            {Array.from({ length: START_HEARTS }).map((_, i) => (
              <Text key={i} style={[styles.heartMini, i >= hearts && styles.heartMiniOff]}>
                ❤️
              </Text>
            ))}
          </View>
        </View>

        {/* teaser banner, per the doc — present throughout the level */}
        {phase !== 'complete' && (
          <View style={styles.teaserBanner}>
            <Text style={styles.teaserTxt}>🔒 Archive d'Athéna — Borne 10</Text>
          </View>
        )}

        {phase === 'question' || phase === 'feedback' ? (
          <View style={styles.timerTrack}>
            <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
          </View>
        ) : null}

        {phase === 'category' && (
          <View style={styles.body}>
            <Text style={styles.crossroadsTitle}>{story.title}</Text>
            <Text style={styles.storyIntro}>{story.intro}</Text>
            <Text style={styles.crossroadsSub}>Choisis ta route pour les 5 prochaines questions.</Text>
            <View style={styles.categoryList}>
              {CATEGORIES.map((c, i) => (
                <Pressable key={c.key} style={styles.categoryBtn} onPress={() => chooseCategory(i)}>
                  <Text style={styles.categoryIcon}>{c.icon}</Text>
                  <Text style={styles.categoryLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(phase === 'question' || phase === 'feedback') && question && (
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
        )}

        {phase === 'complete' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.cheering} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>Borne 2 franchie !</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>
              {category?.label} · {correctCount}/{questions.length} bonnes réponses · {hearts} ❤️ restants
            </Text>
            <Pressable style={styles.completeBtn} onPress={goBack}>
              <LinearGradient colors={[colors.goldLt, colors.gold, colors.goldDp]} style={StyleSheet.absoluteFill} />
              <Text style={styles.completeBtnTxt}>Retour à la carte</Text>
            </Pressable>
          </View>
        )}

        {phase !== 'complete' && tauntBubble}
      </SafeAreaView>

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

  teaserBanner: {
    alignSelf: 'center', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 999, paddingVertical: 5, paddingHorizontal: 14,
  },
  teaserTxt: { fontFamily: fonts.bodyExtra, fontSize: 10.5, color: 'rgba(255,255,255,0.9)', letterSpacing: 0.3 },

  timerTrack: {
    height: 6, marginHorizontal: 14, marginTop: 12, borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.cHermes, borderRadius: 3 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 26 },

  crossroadsTitle: { fontFamily: fonts.disp, fontSize: 19, color: '#fff', textAlign: 'center' },
  crossroadsSub: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 },
  storyIntro: { fontFamily: fonts.bodyBold, fontSize: 12.5, fontStyle: 'italic', color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 10, lineHeight: 18 },
  categoryList: { marginTop: 30, gap: 16 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.lg, paddingVertical: 18, paddingHorizontal: 22,
    ...shadow.md,
  },
  categoryIcon: { fontSize: 28 },
  categoryLabel: { fontFamily: fonts.dispSemi, fontSize: 17, color: colors.ink },

  card: {
    backgroundColor: 'rgba(255,255,255,0.94)', borderRadius: radii.lg, padding: 22,
    minHeight: 120, alignItems: 'center', justifyContent: 'center', ...shadow.md,
  },
  prompt: { fontFamily: fonts.dispSemi, fontSize: 17, color: colors.ink, textAlign: 'center', lineHeight: 24 },

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
});
