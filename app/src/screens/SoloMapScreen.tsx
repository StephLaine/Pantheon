import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Animated,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import ConfettiCannon from 'react-native-confetti-cannon';

import { colors, fonts, radii, shadow, toRoman } from '../theme';
import { HC } from '../theme/home';
import { withAlpha } from '../utils/color';
import { mascots, parallax, plaques } from '../assets';
import {
  CHAPTERS,
  TOTAL_LEVELS,
  LEADERBOARD,
  LB_AVATAR_COLORS,
  chapterFor,
  type LevelInfo,
  type LevelState,
} from '../data/pantheon';
import LevelNode from '../components/LevelNode';
import { useGameStore, HEARTS_MAX } from '../state/game';
import { playMusic, stopMusic } from '../audio/sound';

// hearts can grow past this (streak bonuses, refills, etc.) — rather than drawing
// one icon per heart, show a capped row and badge the count once it overflows
const HEARTS_CAP = 3;

// how far adjacent chapter bands overlap and cross-fade into each other, ported
// from the reference HTML's mask-image technique (web only — CSS masks aren't a
// real style property on native, so bands there just abut with the tint blend)
const SCENE_OVERLAP = 170;

const SPACING_Y = 98;
const TOP_PAD = 46;
// extra room below level 1 for the Hermes "starting gate" plaque, which sits below
// (rather than between) levels since it's the very first chapter
const BOTTOM_PAD = 170;

// every chapter now has its own ornate banner art (emblem baked in) — name/range
// text is overlaid on top of each rather than drawn as separate coded elements.
// aspect + text-anchor % differ per banner since each was cropped to its own
// artwork's bounding box; colors are picked to sit legibly on each banner's tone.
const PLAQUE_W = 260;
const PLAQUE_ASSET: Record<string, any> = {
  "Hermes' Trailhead": plaques.hermesTrailhead,
  "Athena's Archive": plaques.athenaArchive,
  "Poseidon's Depths": plaques.poseidonDepths,
  "Ares' Arena": plaques.aresArena,
  "Zeus' Summit": plaques.zeusSummit,
};
const PLAQUE_LAYOUT: Record<
  string,
  { aspect: number; nameTop: `${number}%`; rangeTop: `${number}%`; nameColor: string; rangeColor: string }
> = {
  "Hermes' Trailhead": { aspect: 266 / 700, nameTop: '48%', rangeTop: '86%', nameColor: colors.bronzeDk, rangeColor: colors.bronzeDk },
  "Athena's Archive": { aspect: 480 / 700, nameTop: '41%', rangeTop: '58%', nameColor: colors.bronzeDk, rangeColor: '#f5e6c8' },
  "Poseidon's Depths": { aspect: 479 / 700, nameTop: '43%', rangeTop: '65%', nameColor: colors.bronzeDk, rangeColor: '#eaf3ff' },
  "Ares' Arena": { aspect: 331 / 681, nameTop: '55%', rangeTop: '82%', nameColor: '#f3d9a8', rangeColor: '#f3d9a8' },
  "Zeus' Summit": { aspect: 329 / 675, nameTop: '47%', rangeTop: '75%', nameColor: colors.bronzeDk, rangeColor: colors.bronzeDk },
};

// only 3 unique photos cover 5 chapters — each chapter's own accent color is
// tinted on top so reused images (Poseidon/Zeus, Ares/Hermes) still read as
// distinct realms instead of looking like the exact same background
const CHAPTER_SCENE: Record<string, any> = {
  "Hermes' Trailhead": parallax.trailheadGateGround,
  "Athena's Archive": parallax.floatingTempleIslands,
  "Poseidon's Depths": parallax.skyCloudsBackdrop,
  "Ares' Arena": parallax.trailheadGateGround,
  "Zeus' Summit": parallax.skyCloudsBackdrop,
};

export default function SoloMapScreen() {
  const navigation = useNavigation();
  const { width: windowWidth } = useWindowDimensions();
  const mapWidth = windowWidth;
  const centerX = mapWidth / 2;
  const amplitude = Math.min(90, mapWidth * 0.26);

  const hearts = useGameStore((s) => s.hearts);
  const coins = useGameStore((s) => s.coins);
  const currentLevel = useGameStore((s) => s.currentLevel);
  const completedLevels = useGameStore((s) => s.completedLevels);
  const grantHeartFromAd = useGameStore((s) => s.grantHeartFromAd);
  const setHearts = useGameStore((s) => s.setHearts);

  const levels: LevelInfo[] = useMemo(
    () =>
      Array.from({ length: TOTAL_LEVELS }, (_, idx) => {
        const n = idx + 1;
        const state: LevelState = completedLevels.includes(n) ? 'done' : n === currentLevel ? 'current' : 'locked';
        return { n, isReward: n % 10 === 0, state };
      }),
    [currentLevel, completedLevels],
  );

  const MAP_H = TOP_PAD + (TOTAL_LEVELS - 1) * SPACING_Y + BOTTOM_PAD;

  // manual nudge for specific level nodes, on top of the sine-wave formula below —
  // add/edit an entry as { levelNumber: [dx, dy] } to shift just that one node
  const LEVEL_OFFSETS: Record<number, [number, number]> = {
    10: [50, 50],
  };

  const pts = useMemo(
    () =>
      Array.from({ length: TOTAL_LEVELS }, (_, i) => {
        const n = i + 1;
        const [dx, dy] = LEVEL_OFFSETS[n] ?? [0, 0];
        return {
          x: centerX + Math.sin(i * 0.62) * amplitude + dx,
          y: TOP_PAD + (TOTAL_LEVELS - 1 - i) * SPACING_Y + dy,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [centerX, amplitude],
  );

  const pathD = useMemo(() => {
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const midX = (pts[i - 1].x + pts[i].x) / 2;
      const midY = (pts[i - 1].y + pts[i].y) / 2;
      d += ` Q ${pts[i - 1].x} ${pts[i - 1].y} ${midX} ${midY}`;
      if (i === pts.length - 1) d += ` L ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }, [pts]);

  // each chapter's scenery band covers exactly its own levels' territory —
  // the shared boundary with a neighboring chapter is the same midpoint used
  // for that neighbor's plaque, so the seam always lands on the real transition
  const chapterBounds = useMemo(
    () =>
      CHAPTERS.map((ch, j) => {
        const prev = CHAPTERS[j - 1];
        const next = CHAPTERS[j + 1];
        const top = next ? (pts[ch.to - 1].y + pts[next.from - 1].y) / 2 : 0;
        const bottom = prev ? (pts[ch.from - 1].y + pts[prev.to - 1].y) / 2 : MAP_H;
        return { top, bottom };
      }),
    [pts, MAP_H],
  );

  const scrollRef = useRef<ScrollView>(null);
  const curP = pts[currentLevel - 1];

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: Math.max(0, curP.y - 260), animated: true });
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    playMusic('menu');
    return stopMusic;
  }, []);

  const [toast, setToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function say(msg: string) {
    setToast(msg);
    Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      Animated.timing(toastOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start();
    }, 1800);
  }

  const [chestOpen, setChestOpen] = useState(false);
  const [chestInfo, setChestInfo] = useState({ title: '', body: '' });
  const [heartsOpen, setHeartsOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const confettiRef = useRef<ConfettiCannon>(null);

  // a level screen redirects here (with this param) the moment hearts hit 0
  // mid-question, so the refill modal is already open when the player lands
  const route = useRoute<any>();
  useEffect(() => {
    if (route.params?.openHeartsModal) {
      setHeartsOpen(true);
      navigation.setParams({ openHeartsModal: undefined } as never);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.openHeartsModal]);

  // only Levels 1–10 (Hermes' Trailhead) have a real (mockup) question flow
  // built so far — everything else keeps the placeholder toast/chest behavior
  // until its own quiz exists.
  const QUIZ_SCREEN_FOR_LEVEL: Record<number, string> = {
    1: 'LevelQuiz', 2: 'Level2Quiz', 3: 'Level3Quiz', 4: 'Level4Quiz', 5: 'Level5Quiz',
    6: 'Level6Quiz', 7: 'Level7Quiz', 8: 'Level8Quiz', 9: 'Level9Quiz', 10: 'Level10Quiz',
  };

  function onNodePress(level: LevelInfo) {
    const ch = chapterFor(level.n);
    const screen = QUIZ_SCREEN_FOR_LEVEL[level.n];
    if (screen) {
      if (level.state === 'locked') {
        say(`🔒 Verrouillé — termine d'abord le niveau ${toRoman(level.n - 1)}`);
        return;
      }
      if (hearts <= 0) {
        setHeartsOpen(true);
        return;
      }
      // 'current' or 'done' (replay) both drop straight into the real quiz —
      // level 10 is technically a reward level too, but its own finale/handoff
      // already is the reward, so it skips the generic chest modal below.
      (navigation as any).navigate(screen);
      return;
    }
    if (level.state === 'locked') {
      say(
        level.isReward
          ? `Atteins le niveau ${toRoman(level.n)} pour débloquer ce sanctuaire 💰`
          : `🔒 Verrouillé — termine d'abord le niveau ${toRoman(level.n - 1)}`,
      );
    } else if (level.state === 'current') {
      say(`▶️ Entrée dans le niveau ${toRoman(level.n)}…`);
    } else if (level.isReward) {
      setChestInfo({
        title: `Sanctuaire du niveau ${toRoman(level.n)} nettoyé !`,
        body: `+1,00 $ de bonus récupéré à ${ch.nameFr}.`,
      });
      setChestOpen(true);
      confettiRef.current?.start();
    } else {
      say(`Rejouer le niveau ${toRoman(level.n)}`);
    }
  }

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[colors.skyTop, colors.skyMid, colors.skyBottom]} style={StyleSheet.absoluteFill} />

      {/* MAP — fills the entire screen (behind the status bar too); the chrome below floats on top of it */}
      <ScrollView
        ref={scrollRef}
        style={StyleSheet.absoluteFill}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
          <View style={{ width: mapWidth, height: MAP_H, alignSelf: 'center' }}>
            {/* rendered bottom-chapter-first (reverse of level order) so each band that
                overlaps its upper neighbor paints on top of it — required for the
                fade-in/fade-out masks below to actually cross-dissolve, not just stack */}
            {[...CHAPTERS].reverse().map((ch) => {
              const j = CHAPTERS.indexOf(ch);
              const bounds = chapterBounds[j];
              const fadeTop = j < CHAPTERS.length - 1; // a higher chapter shares this edge
              const fadeBottom = j > 0; // a lower chapter shares this edge
              const top = fadeTop ? bounds.top - SCENE_OVERLAP : bounds.top;
              const bottom = fadeBottom ? bounds.bottom + SCENE_OVERLAP : bounds.bottom;
              const h = bottom - top;

              let maskCss: string | undefined;
              if (fadeTop && fadeBottom) {
                maskCss = `linear-gradient(to bottom, transparent 0, black ${SCENE_OVERLAP}px, black ${h - SCENE_OVERLAP}px, transparent 100%)`;
              } else if (fadeBottom) {
                maskCss = `linear-gradient(to bottom, black 0, black ${h - SCENE_OVERLAP}px, transparent 100%)`;
              } else if (fadeTop) {
                maskCss = `linear-gradient(to bottom, transparent 0, black ${SCENE_OVERLAP}px, black 100%)`;
              }
              const maskStyle = Platform.OS === 'web' && maskCss ? ({ maskImage: maskCss, WebkitMaskImage: maskCss } as any) : null;

              const prev = CHAPTERS[j - 1];
              const next = CHAPTERS[j + 1];
              // the tint itself blends toward each neighbor's color at the shared edge
              // (not just a shadow on top) so the hand-off between two different photos
              // reads as a color cross-fade instead of a hard cut
              const tintColors: [string, string, string, string] = [
                withAlpha(next ? next.color : ch.color, next ? 0.3 : 0.34),
                withAlpha(ch.color, 0.3),
                withAlpha(ch.color, 0.16),
                withAlpha(prev ? prev.color : ch.color, prev ? 0.3 : 0.14),
              ];

              return (
                <View key={ch.name} style={{ position: 'absolute', left: 0, top, width: mapWidth, height: h }}>
                  <Image
                    source={CHAPTER_SCENE[ch.name]}
                    style={[{ width: mapWidth, height: h }, maskStyle]}
                    contentFit="cover"
                  />
                  <LinearGradient
                    pointerEvents="none"
                    colors={tintColors}
                    locations={[0, 0.16, 0.84, 1]}
                    style={[StyleSheet.absoluteFill, maskStyle]}
                  />
                </View>
              );
            })}

            {/* vignette hugging the path */}
            <LinearGradient
              pointerEvents="none"
              colors={['rgba(10,8,25,0.22)', 'transparent', 'rgba(10,8,25,0.22)']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />

            <Svg width={mapWidth} height={MAP_H} style={StyleSheet.absoluteFill}>
              <Path d={pathD} fill="none" stroke="rgba(246,241,228,0.5)" strokeWidth={14} strokeLinecap="round" />
              <Path d={pathD} fill="none" stroke={colors.goldDp} strokeWidth={6} strokeLinecap="round" strokeDasharray="2,14" />
            </Svg>

            {CHAPTERS.map((ch, j) => {
              // anchor the plaque at the same boundary the scenery bands share with
              // the previous chapter, so it never collides with either node's own
              // footprint — Hermes (the very first chapter) has no "previous" level,
              // so it sits as a starting-gate sign just below level 1 instead.
              const plaqueCenterY = j > 0 ? chapterBounds[j].bottom : pts[ch.from - 1].y + 78;

              const layout = PLAQUE_LAYOUT[ch.name];
              const plaqueH = PLAQUE_W * layout.aspect;
              const displayName = ch.nameFr;

              return (
                <View
                  key={`plaque-${ch.name}`}
                  style={{ position: 'absolute', width: PLAQUE_W, height: plaqueH, top: plaqueCenterY - plaqueH * 0.42, left: centerX - PLAQUE_W / 2 }}
                >
                  <Image source={PLAQUE_ASSET[ch.name]} style={{ width: '100%', height: '100%' }} contentFit="contain" />
                  <Text style={[styles.plaqueImgName, { top: layout.nameTop, color: layout.nameColor }]}>{displayName}</Text>
                  <Text style={[styles.plaqueImgRange, { top: layout.rangeTop, color: layout.rangeColor }]}>{toRoman(ch.from)}–{toRoman(ch.to)}</Text>
                </View>
              );
            })}

            {levels.map((lvl, i) => (
              <LevelNode
                key={lvl.n}
                level={lvl}
                x={pts[i].x}
                y={pts[i].y}
                shape={(['a', 'b', 'c'] as const)[i % 3]}
                onPress={onNodePress}
              />
            ))}

            <Image
              source={mascots.idle}
              style={{
                position: 'absolute',
                left: curP.x + 40,
                top: curP.y - 70,
                width: 74,
                height: 74,
              }}
              contentFit="contain"
            />
          </View>
      </ScrollView>

      {/* CHROME — floats over the full-bleed map, respects the notch itself */}
      <SafeAreaView style={styles.chromeOverlay} edges={['top']} pointerEvents="box-none">
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(10,20,45,0.55)', 'rgba(10,20,45,0)']}
          style={styles.chromeScrim}
        />

        {/* HEADER */}
        <View style={styles.topbar}>
          <Pressable onPress={() => (navigation as any).navigate('Home')}>
            <LinearGradient colors={[HC.blueLt, HC.blue]} style={styles.iconBtn}>
              <Text style={{ fontSize: 16, color: '#fff' }}>←</Text>
            </LinearGradient>
          </Pressable>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.title}>Chemin du Panthéon</Text>
            <Text style={styles.subtitle}>MODE SOLO • L NIVEAUX</Text>
          </View>
          <LinearGradient colors={[HC.cyan, HC.blue]} style={styles.coinPill}>
            <Text>🪙</Text>
            <Text style={styles.coinText}>{coins}</Text>
          </LinearGradient>
        </View>

        {/* HEARTS */}
        <View style={styles.heartsBar}>
          <View style={styles.hearts}>
            {Array.from({ length: HEARTS_CAP }).map((_, i) => {
              const filled = i < Math.min(hearts, HEARTS_CAP);
              const isLast = i === HEARTS_CAP - 1;
              return (
                <View key={i}>
                  <Text style={[styles.heart, !filled && styles.heartOff]}>{filled ? '❤️' : '🤍'}</Text>
                  {isLast && hearts > HEARTS_CAP && (
                    <View style={styles.heartBadge}>
                      <Text style={styles.heartBadgeText}>{hearts}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
          <Pressable onPress={() => setHeartsOpen(true)}>
            <LinearGradient colors={[HC.cyan, HC.blue]} style={styles.refill}>
              <Text style={{ color: '#fff', fontWeight: '900', fontSize: 13 }}>+</Text>
            </LinearGradient>
          </Pressable>
        </View>

        {/* LEADERBOARD TEASER */}
        <Pressable onPress={() => setBoardOpen(true)}>
          <LinearGradient colors={[HC.blue, HC.blueLt, HC.cyan]} style={styles.board}>
            <Text style={styles.boardBig}>🏆</Text>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.boardTitle}>Prix hebdomadaire du Panthéon</Text>
              <Text style={styles.boardSub}>Le top 10 est récompensé • Se termine dans 3j 14h</Text>
            </View>
            <Text style={styles.boardGo}>›</Text>
          </LinearGradient>
        </Pressable>
      </SafeAreaView>

      {toast && (
        <Animated.View style={[styles.toast, { opacity: toastOpacity }]}>
          <Text style={styles.toastText}>{toast}</Text>
        </Animated.View>
      )}

      <ConfettiCannon
        ref={confettiRef}
        count={70}
        origin={{ x: windowWidth / 2, y: 0 }}
        autoStart={false}
        fadeOut
        colors={[colors.goldLt, colors.gold, colors.goldDp, '#ffffff']}
      />

      {/* CHEST MODAL */}
      <Modal transparent visible={chestOpen} animationType="slide" onRequestClose={() => setChestOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Pressable style={styles.closeBtn} onPress={() => setChestOpen(false)}>
              <Text style={{ color: HC.inkSoft }}>✕</Text>
            </Pressable>
            <Image source={mascots.jackpot} style={styles.cardMascot} contentFit="contain" />
            <Text style={styles.cardTitle}>{chestInfo.title}</Text>
            <Text style={styles.cardBody}>{chestInfo.body}</Text>
            <Pressable onPress={() => setChestOpen(false)}>
              <LinearGradient colors={['#34E1F0', '#12A6F2', HC.blue]} style={styles.primaryBtn}>
                <Text style={styles.primaryBtnText}>Récupérer la récompense</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* HEARTS MODAL */}
      <Modal transparent visible={heartsOpen} animationType="slide" onRequestClose={() => setHeartsOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Pressable style={styles.closeBtn} onPress={() => setHeartsOpen(false)}>
              <Text style={{ color: HC.inkSoft }}>✕</Text>
            </Pressable>
            <Image source={mascots.timeRunningOut} style={styles.cardMascot} contentFit="contain" />
            <Text style={styles.cardTitle}>Plus de cœurs</Text>
            <Text style={styles.cardBody}>Recharge pour continuer à gravir le Chemin du Panthéon.</Text>
            {[
              { icon: '📺', label: 'Regarder une pub', sub: '+1 cœur, instantanément', price: 'Gratuit', msg: '▶️ Lecture de la pub… +1 cœur !', apply: () => grantHeartFromAd() },
              { icon: '❤️', label: 'Recharger 5 cœurs', sub: 'Retour à pleine forme', price: '0,99 $', msg: '💳 Achat : Recharger 5 cœurs — 0,99 $', apply: () => setHearts(HEARTS_MAX) },
              { icon: '♾️', label: 'Cœurs illimités', sub: 'Pendant 7 jours', price: '2,99 $', msg: '💳 Achat : Cœurs illimités — 2,99 $', apply: undefined },
            ].map((opt) => (
              <Pressable
                key={opt.label}
                style={styles.storeOpt}
                onPress={() => { setHeartsOpen(false); opt.apply?.(); say(opt.msg); }}
              >
                <Text style={{ fontSize: 22 }}>{opt.icon}</Text>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.storeOptLabel}>{opt.label}</Text>
                  <Text style={styles.storeOptSub}>{opt.sub}</Text>
                </View>
                <Text style={styles.storeOptPrice}>{opt.price}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Modal>

      {/* LEADERBOARD MODAL */}
      <Modal transparent visible={boardOpen} animationType="slide" onRequestClose={() => setBoardOpen(false)}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Pressable style={styles.closeBtn} onPress={() => setBoardOpen(false)}>
              <Text style={{ color: HC.inkSoft }}>✕</Text>
            </Pressable>
            <Text style={styles.cardTitle}>Prix hebdomadaire du Panthéon</Text>
            <Text style={styles.cardBody}>Le top 10 se partage 250 $ • Réinitialisation dans 3j 14h</Text>
            <ScrollView style={{ maxHeight: 260 }}>
              {LEADERBOARD.map((p, i) => (
                <View key={p.rank} style={styles.lbRow}>
                  <Text style={[styles.lbRank, p.rank <= 3 && styles.lbRankTop]}>{p.rank}</Text>
                  <View style={[styles.lbAvatar, { backgroundColor: LB_AVATAR_COLORS[i % LB_AVATAR_COLORS.length] }]}>
                    <Text style={{ color: '#fff', fontFamily: fonts.disp, fontSize: 13 }}>{p.name[0]}</Text>
                  </View>
                  <Text style={styles.lbName}>{p.name}</Text>
                  <Text style={styles.lbScore}>{p.score.toLocaleString('fr-FR')} pts</Text>
                  <Text style={styles.lbPrize}>{p.prize} $</Text>
                </View>
              ))}
            </ScrollView>
            <View style={[styles.lbRow, styles.lbYou]}>
              <Text style={styles.lbRank}>47</Text>
              <View style={[styles.lbAvatar, { backgroundColor: HC.blue }]}>
                <Text style={{ color: '#fff', fontFamily: fonts.disp, fontSize: 13 }}>A</Text>
              </View>
              <Text style={styles.lbName}>Toi</Text>
              <Text style={styles.lbScore}>1 240 pts</Text>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  chromeOverlay: { position: 'absolute', top: 0, left: 0, right: 0 },
  chromeScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 220 },
  topbar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8 },
  iconBtn: {
    width: 38, height: 38, borderRadius: 19,
    alignItems: 'center', justifyContent: 'center', ...shadow.sm,
  },
  title: { fontFamily: fonts.disp, fontSize: 18, color: '#fff', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 8 },
  subtitle: { fontFamily: fonts.bodyExtra, fontSize: 9.5, color: HC.cyan, letterSpacing: 1.2 },
  coinPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, ...shadow.sm,
  },
  coinText: { fontFamily: fonts.disp, fontSize: 13, color: '#fff' },

  heartsBar: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff',
    alignSelf: 'flex-start', marginLeft: 16, marginTop: 8, borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 6, paddingLeft: 10,
    ...shadow.sm,
  },
  hearts: { flexDirection: 'row', gap: 2 },
  heart: { fontSize: 13 },
  heartOff: { opacity: 0.28 },
  heartBadge: {
    position: 'absolute', top: -5, right: -7, minWidth: 15, height: 15, borderRadius: 8, paddingHorizontal: 3,
    backgroundColor: HC.red, borderWidth: 1.5, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  heartBadgeText: { fontFamily: fonts.bodyExtra, fontSize: 8.5, color: '#fff' },
  refill: {
    width: 22, height: 22, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },

  board: {
    marginHorizontal: 16, marginTop: 10, borderRadius: radii.md, padding: 13,
    flexDirection: 'row', alignItems: 'center', gap: 11, ...shadow.md,
  },
  boardBig: { fontSize: 26 },
  boardTitle: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: '#fff' },
  boardSub: { fontFamily: fonts.bodyExtra, fontSize: 10, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  boardGo: { fontSize: 18, color: '#fff' },

  plaqueImgName: {
    position: 'absolute', left: '11%', width: '78%', textAlign: 'center',
    fontFamily: fonts.disp, fontSize: 12.5, letterSpacing: 0.3,
  },
  plaqueImgRange: {
    position: 'absolute', left: '25%', width: '50%', textAlign: 'center',
    fontFamily: fonts.bodyExtra, letterSpacing: 1.2, fontSize: 9,
  },

  toast: {
    position: 'absolute', left: '50%', bottom: 32, transform: [{ translateX: -120 }],
    width: 240, backgroundColor: 'rgba(15,35,80,0.92)', borderRadius: 14, paddingVertical: 11,
    paddingHorizontal: 16, borderWidth: 1, borderColor: 'rgba(15,210,230,0.3)',
  },
  toastText: { fontFamily: fonts.bodyExtra, fontSize: 13, color: '#fff', textAlign: 'center' },

  overlay: { flex: 1, backgroundColor: 'rgba(10,20,45,0.6)', justifyContent: 'flex-end' },
  card: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 22, paddingTop: 26, alignItems: 'center',
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14, width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(15,35,80,0.08)', alignItems: 'center', justifyContent: 'center',
  },
  cardMascot: { width: 120, height: 120, marginBottom: 6 },
  cardTitle: { fontFamily: fonts.disp, fontSize: 19, color: HC.ink, marginBottom: 4, textAlign: 'center' },
  cardBody: { fontFamily: fonts.bodyBold, fontSize: 13, color: HC.inkSoft, marginBottom: 16, textAlign: 'center' },
  primaryBtn: { width: 280, borderRadius: radii.md, paddingVertical: 15, alignItems: 'center', ...shadow.md },
  primaryBtnText: { fontFamily: fonts.disp, fontSize: 16, color: '#fff' },

  storeOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 11, width: '100%', backgroundColor: '#fff',
    borderRadius: 16, padding: 13, marginBottom: 9, borderWidth: 1, borderColor: 'rgba(41,98,255,0.25)', ...shadow.sm,
  },
  storeOptLabel: { fontFamily: fonts.dispSemi, fontSize: 13.5, color: HC.ink },
  storeOptSub: { fontFamily: fonts.bodyExtra, fontSize: 10.5, color: HC.inkSoft },
  storeOptPrice: { fontFamily: fonts.disp, fontSize: 13.5, color: HC.blue },

  lbRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: 'rgba(15,35,80,0.08)', width: '100%',
  },
  lbRank: { width: 22, textAlign: 'center', fontFamily: fonts.disp, fontSize: 13, color: HC.inkSoft },
  lbRankTop: { color: HC.blue },
  lbAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  lbName: { flex: 1, fontFamily: fonts.bodyExtra, fontSize: 12.5, color: HC.ink },
  lbScore: { fontFamily: fonts.bodyExtra, fontSize: 10.5, color: HC.inkSoft },
  lbPrize: { fontFamily: fonts.disp, fontSize: 12.5, color: HC.green },
  lbYou: { backgroundColor: 'rgba(41,98,255,0.12)', borderRadius: 14, marginTop: 6, paddingHorizontal: 12, borderBottomWidth: 0 },
});
