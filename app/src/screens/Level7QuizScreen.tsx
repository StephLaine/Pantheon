import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Easing, ActivityIndicator } from 'react-native';
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
import { fetchCategories, QuizCategory } from '../data/quizContent';

const story = STORY[7];

const QUESTION_TIME = 25; // seconds — chrono relâché, plus long qu'aux niveaux 1-3
const START_HEARTS = 3;

type Phase = 'category' | 'question' | 'feedback' | 'complete';

export default function Level7QuizScreen() {
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
  const [categories, setCategories] = useState<QuizCategory[] | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    fetchCategories(7).then(setCategories).catch((e) => console.warn('fetch categories failed', e));
  }, []);

  useEffect(() => {
    playMusic('repos');
    return stopMusic;
  }, []);

  useEffect(() => {
    if (phase !== 'question') return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, phase]);

  if (!categories) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.skyTop }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  const category = categoryIndex !== null ? categories[categoryIndex] : null;
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

  function chooseCategory(i: number) {
    playSfx('tap');
    setCategoryIndex(i);
    setPhase('question');
  }

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · pas de cœur perdu`, pick(TIMEOUT_MASCOTS), 1500);
    setTimeout(advance, 1500);
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
      const heartsLeft = loseHeart();
      playSfx('wrong');
      playSfx('heartLose');
      showTaunt(`${pick(WRONG_TAUNTS)} · −1 ❤️`, pick(WRONG_MASCOTS), 1300);
      setTimeout(() => {
        if (heartsLeft <= 0) (navigation as any).navigate('SoloMap', { openHeartsModal: true });
        else advance();
      }, 1300);
    }
  }

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 2200);
  }

  function advance() {
    if (isLast) {
      setPhase('complete');
      completeLevel(7);
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
            <Text style={styles.topbarTitle}>Niveau {toRoman(7)} · Le Repos du Voyageur</Text>
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

        {phase === 'category' && (
          <View style={styles.body}>
            <Text style={styles.calmTitle}>{story.title}</Text>
            <Text style={styles.storyIntro}>{story.intro}</Text>
            <Text style={styles.calmSub}>Une borne détendue. Choisis ta route.</Text>
            <View style={styles.categoryList}>
              {categories.map((c, i) => (
                <Pressable key={c.key} style={styles.categoryBtn} onPress={() => chooseCategory(i)}>
                  <Text style={styles.categoryIcon}>{c.icon}</Text>
                  <Text style={styles.categoryLabel}>{c.label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {(phase === 'question' || phase === 'feedback') && question && (
          <>
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
          </>
        )}

        {phase === 'complete' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.dailyBonus} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>Borne 7 franchie !</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>
              {category?.label} · {correctCount}/{questions.length} bonnes réponses · {hearts} ❤️ restants
            </Text>
            <View style={styles.giftCard}>
              <Text style={styles.giftTitle}>🎁 Un cadeau d'Hermès</Text>
              <Text style={styles.giftLine}>« Hermès écarte deux fausses pistes. »</Text>
              <Text style={styles.giftLine}>Tu gagnes 1 « 50/50 » gratuit — gardé pour le mur 9.</Text>
            </View>
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
  topbarTitle: { fontFamily: fonts.dispSemi, fontSize: 12.5, color: '#fff' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotDone: { backgroundColor: colors.goldLt },
  dotCurrent: { backgroundColor: '#fff' },
  heartsMini: { flexDirection: 'row', gap: 2, width: 34 * 3 },
  heartMini: { fontSize: 15 },
  heartMiniOff: { opacity: 0.25 },

  timerTrack: {
    height: 6, marginHorizontal: 14, marginTop: 12, borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.18)', overflow: 'hidden',
  },
  timerFill: { height: '100%', backgroundColor: colors.cHermes, borderRadius: 3 },

  body: { flex: 1, paddingHorizontal: 20, paddingTop: 26 },

  calmTitle: { fontFamily: fonts.disp, fontSize: 19, color: '#fff', textAlign: 'center' },
  calmSub: { fontFamily: fonts.bodyBold, fontSize: 13, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 },
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
  completeMascot: { width: 150, height: 150 },
  completeTitle: { fontFamily: fonts.disp, fontSize: 24, color: colors.ink, marginTop: 8, textAlign: 'center' },
  completeSub: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, marginTop: 8, textAlign: 'center' },
  storyOutro: { fontFamily: fonts.bodyBold, fontSize: 13, fontStyle: 'italic', color: colors.inkSoft, marginTop: 10, textAlign: 'center', lineHeight: 18 },
  giftCard: {
    marginTop: 20, width: '100%', backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: radii.md,
    padding: 16, alignItems: 'center',
  },
  giftTitle: { fontFamily: fonts.dispSemi, fontSize: 14, color: colors.bronzeDk },
  giftLine: { fontFamily: fonts.bodyBold, fontSize: 12.5, color: colors.ink, marginTop: 6, textAlign: 'center' },
  completeBtn: {
    marginTop: 24, width: '100%', borderRadius: radii.md, paddingVertical: 16,
    alignItems: 'center', overflow: 'hidden', ...shadow.md,
  },
  completeBtnTxt: { fontFamily: fonts.dispSemi, fontSize: 15, color: colors.bronzeDk },
});
