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

const story = STORY[10];

// mockup-only mixed question set — frontend flow for Level 10 (Hermes'
// Trailhead finale, "Les Portes de l'Archive"): best-of recap of every format
// seen in levels 1-9 (QCM, Vrai/Faux, a chain-flavored close), moderate
// timer, low drain — "gratifiante", not a wall. Last question is the easy
// Haitian-pride one, per kwizkach_gameplay_niveaux.md.
type Question =
  | { format: 'qcm'; prompt: string; choices: string[]; correct: number }
  | { format: 'tf'; prompt: string; correct: boolean };

const QUESTIONS: Question[] = [
  { format: 'qcm', prompt: "Quelle est la capitale d'Haïti ?", choices: ['Cap-Haïtien', 'Port-au-Prince', 'Jacmel', 'Gonaïves'], correct: 1 },
  { format: 'qcm', prompt: 'Combien de côtés un pentagone a-t-il ?', choices: ['4', '5', '6', '7'], correct: 1 },
  { format: 'tf', prompt: "L'ADN se trouve dans le noyau de la cellule.", correct: true },
  { format: 'tf', prompt: 'Le Brésil se trouve en Afrique.', correct: false },
  { format: 'qcm', prompt: 'Quel est le plus grand pays du monde par superficie ?', choices: ['Chine', 'Canada', 'Russie', 'États-Unis'], correct: 2 },
  { format: 'qcm', prompt: 'En quelle année Haïti a-t-il proclamé son indépendance ?', choices: ['1789', '1804', '1815', '1848'], correct: 1 },
];

const CHAIN_START = 4; // the last 2 questions wear the "chaîne finale" flavor, purely cosmetic
const QUESTION_TIME = 15; // seconds — chrono modéré
const START_HEARTS = 3;
const TICKET_COST = 15;
const JACKPOT_POOL = '4 280';

type Phase = 'question' | 'feedback' | 'qualified' | 'handoff';

export default function Level10QuizScreen() {
  const navigation = useNavigation();

  const [showTutorial, setShowTutorial] = useState(true);
  const [qIndex, setQIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [selected, setSelected] = useState<number | boolean | null>(null);
  const hearts = useGameStore((s) => s.hearts);
  const loseHeart = useGameStore((s) => s.loseHeart);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const [correctCount, setCorrectCount] = useState(0);
  const [chainPerfect, setChainPerfect] = useState(true);
  const { showTaunt, bubble: tauntBubble } = useMascotTaunt();

  const timerAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const confettiRef = useRef<ConfettiCannon>(null);
  const handoffPop = useRef(new Animated.Value(0)).current;

  const question = QUESTIONS[qIndex];
  const isLast = qIndex === QUESTIONS.length - 1;
  const inChain = qIndex >= CHAIN_START;

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
    playMusic('archive');
    return stopMusic;
  }, []);

  useEffect(() => {
    if (phase !== 'question' || showTutorial) return;
    startTimer();
    return clearTimer;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qIndex, showTutorial]);

  function dismissTutorial() {
    playSfx('tap');
    setShowTutorial(false);
  }

  function goBack() {
    playSfx('tap');
    navigation.goBack();
  }

  function onTimeout() {
    setSelected(null);
    setPhase('feedback');
    if (inChain) setChainPerfect(false);
    playSfx('timeout');
    showTaunt(`${pick(TIMEOUT_TAUNTS)} · pas de cœur perdu`, pick(TIMEOUT_MASCOTS), 1300);
    setTimeout(advance, 1300);
  }

  function isAnswerCorrect(choice: number | boolean) {
    return choice === question.correct;
  }

  function onAnswer(choice: number | boolean) {
    if (phase !== 'question') return;
    clearTimer();
    setSelected(choice);
    setPhase('feedback');
    playSfx('select');
    const correct = isAnswerCorrect(choice);
    if (correct) {
      setCorrectCount((c) => c + 1);
      playSfx('correct');
      showTaunt('⚡ Bonne réponse !', mascots.correct, 800);
      setTimeout(advance, 800);
    } else {
      if (inChain) setChainPerfect(false);
      loseHeart();
      playSfx('wrong');
      playSfx('heartLose');
      showTaunt(`${pick(WRONG_TAUNTS)} · −1 ❤️`, pick(WRONG_MASCOTS), 1200);
      setTimeout(advance, 1200);
    }
  }

  function maybeShowBetweenTaunt() {
    if (Math.random() >= BETWEEN_TAUNT_CHANCE) return;
    showTaunt(pick(BETWEEN_TAUNTS), pick(BETWEEN_MASCOTS), 1800);
  }

  function advance() {
    if (isLast) {
      setPhase('qualified');
      completeLevel(10);
      stopMusic();
      playSfx('confetti');
      playStinger('acte3');
      confettiRef.current?.start();
    } else {
      setQIndex((i) => i + 1);
      setSelected(null);
      setPhase('question');
      maybeShowBetweenTaunt();
    }
  }

  function goToHandoff() {
    playSfx('tap');
    setPhase('handoff');
    handoffPop.setValue(0);
    playSfx('confetti');
    playStinger('jackpot');
    Animated.spring(handoffPop, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }).start();
    confettiRef.current?.start();
  }

  const timerWidth = timerAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.skyTop, colors.skyMid, colors.skyBottom]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        {(phase === 'question' || phase === 'feedback') && (
          <>
            <View style={styles.topbar}>
              <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
                <Text style={styles.backTxt}>‹</Text>
              </Pressable>
              <View style={styles.topbarCenter}>
                <Text style={styles.topbarTitle}>🎓 Niveau {toRoman(10)} · Les Portes de l'Archive</Text>
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

            {inChain && <Text style={styles.chainLabel}>⚡ Chaîne finale</Text>}

            <View style={styles.timerTrack}>
              <Animated.View style={[styles.timerFill, { width: timerWidth }]} />
            </View>

            <View style={styles.body}>
              <View style={styles.card}>
                <Text style={styles.prompt}>{question.prompt}</Text>
              </View>

              {question.format === 'qcm' ? (
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
              ) : (
                <View style={styles.tfRow}>
                  {[true, false].map((val) => {
                    const isSelected = selected === val;
                    const isCorrectVal = val === question.correct;
                    const revealed = phase === 'feedback';
                    const showCorrect = revealed && isCorrectVal;
                    const showWrong = revealed && isSelected && !isCorrectVal;
                    return (
                      <Pressable
                        key={String(val)}
                        disabled={phase !== 'question'}
                        onPress={() => onAnswer(val)}
                        style={[styles.tfBtn, showCorrect && styles.choiceCorrect, showWrong && styles.choiceWrong]}
                      >
                        <Text style={styles.tfTxt}>{val ? '✅ VRAI' : '❌ FAUX'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </View>

            {tauntBubble}
          </>
        )}

        {phase === 'qualified' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.levelUp} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.qualifiedTitle}>🏆 Tu es qualifié !</Text>
            <Text style={styles.qualifiedFlavor}>{story.outro}</Text>
            {chainPerfect && <Text style={styles.chainPerfectBadge}>🔥 Chaîne finale parfaite !</Text>}
            <Text style={styles.completeSub}>
              {correctCount}/{QUESTIONS.length} bonnes réponses · {hearts} ❤️ restants
            </Text>
            <Pressable style={styles.completeBtn} onPress={goToHandoff}>
              <LinearGradient colors={[colors.goldLt, colors.gold, colors.goldDp]} style={StyleSheet.absoluteFill} />
              <Text style={styles.completeBtnTxt}>Continuer</Text>
            </Pressable>
          </View>
        )}

        {phase === 'handoff' && (
          <View style={styles.completeWrap}>
            <Image source={mascots.jackpot} style={styles.completeMascot} contentFit="contain" />
            <Text style={styles.handoffTitle}>🦉 L'Archive d'Athéna s'ouvre</Text>
            <Animated.View
              style={[
                styles.handoffCard,
                {
                  opacity: handoffPop,
                  transform: [{ scale: handoffPop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
                },
              ]}
            >
              <Text style={styles.ticketLine}>Ticket : {TICKET_COST} 🪙</Text>
              <Text style={styles.jackpotLine}>Cagnotte en direct</Text>
              <Text style={styles.jackpotValue}>{JACKPOT_POOL} 🏆</Text>
            </Animated.View>
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
            <Pressable style={styles.tutorialBtn} onPress={dismissTutorial}>
              <Text style={styles.tutorialBtnTxt}>Compris !</Text>
            </Pressable>
          </View>
        </View>
      )}

      <ConfettiCannon
        ref={confettiRef}
        count={140}
        origin={{ x: 210, y: 0 }}
        autoStart={false}
        fadeOut
        colors={[colors.goldLt, colors.gold, colors.goldDp, colors.cAthena, '#ffffff']}
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
  topbarTitle: { fontFamily: fonts.dispSemi, fontSize: 11.5, color: '#fff' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 5 },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotDone: { backgroundColor: colors.goldLt },
  dotCurrent: { backgroundColor: '#fff' },
  heartsMini: { flexDirection: 'row', gap: 2, width: 34 * 3 },
  heartMini: { fontSize: 15 },
  heartMiniOff: { opacity: 0.25 },

  chainLabel: { textAlign: 'center', marginTop: 8, fontFamily: fonts.dispSemi, fontSize: 12, color: colors.goldLt },

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

  tfRow: { flexDirection: 'row', gap: 14, marginTop: 26 },
  tfBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: radii.lg, paddingVertical: 26,
    borderWidth: 2, borderColor: 'transparent', ...shadow.sm,
  },
  tfTxt: { fontFamily: fonts.dispSemi, fontSize: 16, color: colors.ink },

  completeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
  completeMascot: { width: 160, height: 160 },
  qualifiedTitle: { fontFamily: fonts.disp, fontSize: 25, color: colors.ink, marginTop: 10, textAlign: 'center' },
  qualifiedFlavor: { fontFamily: fonts.bodyBold, fontSize: 13.5, color: colors.inkSoft, marginTop: 10, textAlign: 'center', lineHeight: 19 },
  chainPerfectBadge: { fontFamily: fonts.dispSemi, fontSize: 13, color: colors.orangeLike, marginTop: 12 },
  completeSub: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.inkSoft, marginTop: 12, textAlign: 'center' },

  handoffTitle: { fontFamily: fonts.disp, fontSize: 21, color: colors.ink, marginTop: 10, textAlign: 'center' },
  handoffCard: {
    marginTop: 20, width: '100%', backgroundColor: 'rgba(255,255,255,0.55)', borderRadius: radii.lg,
    paddingVertical: 22, paddingHorizontal: 20, alignItems: 'center', ...shadow.md,
  },
  ticketLine: { fontFamily: fonts.bodyBold, fontSize: 13, color: colors.inkSoft },
  jackpotLine: { fontFamily: fonts.dispSemi, fontSize: 13, color: colors.bronzeDk, marginTop: 14 },
  jackpotValue: { fontFamily: fonts.disp, fontSize: 36, color: colors.goldDp, marginTop: 4 },

  completeBtn: {
    marginTop: 26, width: '100%', borderRadius: radii.md, paddingVertical: 16,
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
  tutorialTitle: { fontFamily: fonts.disp, fontSize: 18, color: colors.bronzeDk, marginTop: 6, textAlign: 'center' },
  storyIntro: { fontFamily: fonts.bodyBold, fontSize: 13, fontStyle: 'italic', color: colors.ink, marginTop: 12, textAlign: 'center', lineHeight: 19 },
  tutorialBtn: {
    marginTop: 20, backgroundColor: colors.cHermes, borderRadius: radii.md,
    paddingVertical: 13, paddingHorizontal: 34,
  },
  tutorialBtnTxt: { fontFamily: fonts.dispSemi, fontSize: 14, color: '#fff' },
});
