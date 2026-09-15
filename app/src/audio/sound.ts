import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const SFX = {
  tap: require('../../assets/audio/sfx/sfx_tap_generic.mp3'),
  select: require('../../assets/audio/sfx/sfx_answer_select.mp3'),
  correct: require('../../assets/audio/sfx/sfx_answer_correct.mp3'),
  wrong: require('../../assets/audio/sfx/sfx_answer_wrong.mp3'),
  timeout: require('../../assets/audio/sfx/sfx_timeout.mp3'),
  heartLose: require('../../assets/audio/sfx/sfx_heart_lose.mp3'),
  mascotPop: require('../../assets/audio/sfx/sfx_mascot_pop.mp3'),
  coinsPay: require('../../assets/audio/sfx/sfx_coins_pay.mp3'),
  confetti: require('../../assets/audio/sfx/sfx_confetti.mp3'),
  chainPip1: require('../../assets/audio/sfx/sfx_chain_pip_1.mp3'),
  chainPip2: require('../../assets/audio/sfx/sfx_chain_pip_2.mp3'),
  chainPip3: require('../../assets/audio/sfx/sfx_chain_pip_3.mp3'),
  chainPip4: require('../../assets/audio/sfx/sfx_chain_pip_4.mp3'),
  chainBreak: require('../../assets/audio/sfx/sfx_chain_break.mp3'),
  timerTick: require('../../assets/audio/sfx/sfx_timer_tick_loop.mp3'),
  streakWhoosh: require('../../assets/audio/sfx/sfx_streak_whoosh.mp3'),
  streakImpact: require('../../assets/audio/sfx/sfx_streak_impact.mp3'),
  streakTick: require('../../assets/audio/sfx/sfx_streak_tick.mp3'),
  streakChime: require('../../assets/audio/sfx/sfx_streak_chime.mp3'),
} as const;

const MUSIC = {
  menu: require('../../assets/audio/music/mus_menu_loop.mp3'),
  routeSacree: require('../../assets/audio/music/mus_route_sacree_loop.mp3'),
  elan: require('../../assets/audio/music/mus_elan_loop.mp3'),
  mur: require('../../assets/audio/music/mus_mur_loop.mp3'),
  repos: require('../../assets/audio/music/mus_repos_loop.mp3'),
  archive: require('../../assets/audio/music/mus_archive_loop.mp3'),
} as const;

const STINGERS = {
  acte1: { source: require('../../assets/audio/music/sting_victoire_acte1.mp3'), durationMs: 1500 },
  acte2: { source: require('../../assets/audio/music/sting_victoire_acte2.mp3'), durationMs: 2000 },
  acte3: { source: require('../../assets/audio/music/sting_victoire_acte3.mp3'), durationMs: 2500 },
  jackpot: { source: require('../../assets/audio/music/sting_jackpot_final.mp3'), durationMs: 3500 },
} as const;

export type SfxKey = keyof typeof SFX;
export type MusicKey = keyof typeof MUSIC;
export type StingerKey = keyof typeof STINGERS;

const MUSIC_VOLUME = 0.45;

let sfxEnabled = true;
let musicEnabled = true;

export function setAudioEnabled(opts: { sfx?: boolean; music?: boolean }) {
  if (opts.sfx !== undefined) sfxEnabled = opts.sfx;
  if (opts.music !== undefined) {
    musicEnabled = opts.music;
    if (!musicEnabled) activeMusicPlayer?.pause();
    else activeMusicPlayer?.play();
  }
}

export async function configureAudioSession() {
  await setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: false, interruptionMode: 'mixWithOthers' });
}

const sfxPlayers = new Map<SfxKey, AudioPlayer>();

function getSfxPlayer(key: SfxKey): AudioPlayer {
  let player = sfxPlayers.get(key);
  if (!player) {
    player = createAudioPlayer(SFX[key]);
    sfxPlayers.set(key, player);
  }
  return player;
}

export function playSfx(key: SfxKey) {
  if (!sfxEnabled) return;
  const player = getSfxPlayer(key);
  try {
    player.seekTo(0);
    player.play();
  } catch {
    // ignore transient playback errors (e.g. asset still loading)
  }
}

let tickPlayer: AudioPlayer | null = null;

export function startTimerTick() {
  if (!sfxEnabled) return;
  stopTimerTick();
  tickPlayer = createAudioPlayer(SFX.timerTick);
  tickPlayer.loop = true;
  tickPlayer.volume = 0.5;
  tickPlayer.play();
}

export function stopTimerTick() {
  tickPlayer?.pause();
  tickPlayer = null;
}

let activeMusicPlayer: AudioPlayer | null = null;
let activeMusicKey: MusicKey | null = null;

export function playMusic(key: MusicKey) {
  if (activeMusicKey === key) return;
  activeMusicPlayer?.pause();
  activeMusicPlayer = createAudioPlayer(MUSIC[key]);
  activeMusicPlayer.loop = true;
  activeMusicPlayer.volume = MUSIC_VOLUME;
  activeMusicKey = key;
  if (musicEnabled) activeMusicPlayer.play();
}

export function stopMusic() {
  activeMusicPlayer?.pause();
  activeMusicPlayer = null;
  activeMusicKey = null;
}

export function playStinger(key: StingerKey) {
  const { source, durationMs } = STINGERS[key];
  if (musicEnabled && activeMusicPlayer) {
    activeMusicPlayer.volume = MUSIC_VOLUME * 0.15;
  }
  if (sfxEnabled) {
    const player = createAudioPlayer(source);
    player.volume = 1;
    player.play();
  }
  setTimeout(() => {
    if (activeMusicPlayer) activeMusicPlayer.volume = MUSIC_VOLUME;
  }, durationMs + 150);
}
