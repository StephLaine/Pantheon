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
import { useGameStore, HEARTS_MAX } from '../state/game';
import { fetchFlatQuestions, QcmQuestion } from '../data/quizContent';

const story = STORY[6];

const QUESTION_TIME = 7; // seconds — chrono SERRÉ, le mur d'Hermès
const START_HEARTS = 3;
const SKIP_COST = 20;

type Phase = 'question' | 'feedback' | 'frozen' | 'complete';

export default function Level6QuizScreen() {
  const navigation = useNavigation();

  const [showTutorial, setShowTutorial] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeartStore = useGameStore((s) => s.loseHeart);
  const setHeartsStore = useGameStore((s) => s.setHearts);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const coins = useGameStore((s) => s.coins);
  const spendCoins = useGameStore((s) => s.spendCoins);
  const [correctCount, setCorrectCount] = useState(0);
  const { showTaunt, bubble: tauntBubble } = useMascotTaunt();
  const [questions, setQuestions] = useState<QcmQuestion[] | null>(null);

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);

  useEffect(() => {
    fetchFlatQuestions(6).then(setQuestions).catch((e) => console.warn('fetch questions failed', e));
  }, []);

  useEffect(() => {
    playMusic('mur');
    return stopMusic;
  }, []);

  useEffect(() => {
    if (showTutorial || phase === 'frozen' || !questions) return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, showTutorial, questions]);

  if (!questions) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.skyTop }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

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

  function loseHeart(): boolean {
    const next = loseHeartStore();
    return next === 0;
  }

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    playSfx('timeout');
    playSfx('heartLose');
    // Level 6: the one rule that changes — timeout costs a heart here
    const willFreeze = loseHeart();
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · −1 ❤️ (mur !)`, pick(TIMEOUT_MASCOTS), 1200);
    setTimeout(() => advance(willFreeze), 1200);
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
      showTaunt('⚡ Bonne réponse !', mascots.correct, 700);
      setTimeout(() => advance(false), 700);
    } else {
      const willFreeze = loseHeart();
      playSfx('wrong');
      playSfx('heartLose');
      showTaunt(`${pick(WRONG_TAUNTS)} · −1 ❤️`, pick(WRONG_MASCOTS), 1100);
      setTimeout(() => advance(willFreeze), 1100);
    }
  }

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 1600);
  }

  function advance(froze: boolean) {
    if (froze) {
      setPhase('frozen');
      return;
    }
    if (isLast) {
      setPhase('complete');
      completeLevel(6);
      stopMusic();
      playSfx('confetti');
      playStinger('acte2');
      confettiRef.current?.start();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setPhase('question');
      maybeShowBetweenTaunt();
    }
  }

  function payToSkip() {
    if (coins < SKIP_COST) {
      playSfx('wrong');
      showTaunt('❌ Pas assez de pièces', mascots.winkThumbsUp, 900);
      return;
    }
    playSfx('tap');
    playSfx('coinsPay');
    spendCoins(SKIP_COST, 'coin_spend_skip', 6);
    setPhase('feedback');
    setSelected(null);
    showTaunt('⏭️ Message envoyé — tu passes cette question', mascots.winkThumbsUp, 800);
    setTimeout(() => {
      if (isLast) {
        setPhase('complete');
        completeLevel(6);
        stopMusic();
        playSfx('confetti');
        playStinger('acte2');
        confettiRef.current?.start();
      } else {
        setQIndex((i) => i + 1);
        setPhase('question');
      }
    }, 800);
  }

  function buyHearts() {
    playSfx('tap');
    setHeartsStore(HEARTS_MAX);
    setPhase('question'); // retry the same blocking question, fresh timer
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
                <Text style={styles.topbarTitle}>🧱 Niveau {toRoman(6)} · La Course d'Hermès</Text>
                <View style={styles.dots}>
                  {questions.map((_, i) => (
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
            <Image source={mascots.streak} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.completeTitle}>🔥 Les sandales s'embrasent !</Text>
            <Text style={styles.completeFlavor}>« Hermès t'a porté 💨 »</Text>
            <Text style={styles.storyOutro}>{story.outro}</Text>
            <Text style={styles.completeSub}>
              {correctCount}/{questions.length} bonnes réponses · {hearts} ❤️ restants
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
            <Image source={mascots.determined} style={styles.tutorialMascot} contentFit="contain" />
            <Text style={styles.tutorialTitle}>{story.title}</Text>
            <Text style={styles.storyIntro}>{story.intro}</Text>
            <Text style={styles.tutorialLine}>⏱️ Chrono ULTRA serré : 7 secondes par question.</Text>
            <Text style={styles.tutorialLine}>⚠️ Ici, le temps écoulé coûte aussi −1 ❤️ !</Text>
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
            <Text style={styles.tutorialLine}>Hermès ne peut plus te porter sans un peu d'aide.</Text>
            <Pressable
              style={[styles.paywallOption, coins < SKIP_COST && { opacity: 0.4 }]}
              onPress={payToSkip}
              disabled={coins < SKIP_COST}
            >
              <Text style={styles.paywallOptionTxt}>⏭️ Payer {SKIP_COST} 🪙 · Passer cette question</Text>
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
        colors={[colors.orangeLike, colors.gold, colors.goldDp, '#ffffff']}
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
  completeTitle: { fontFamily: fonts.disp, fontSize: 22, color: colors.ink, marginTop: 8, textAlign: 'center' },
  completeFlavor: { fontFamily: fonts.dispSemi, fontSize: 14, color: colors.orangeLike, marginTop: 6, textAlign: 'center' },
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
