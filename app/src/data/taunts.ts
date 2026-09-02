import { mascots } from '../assets';

// mascot banter shared by every Hermès-chapter level (1–10) — a random line +
// a random pose each trigger, so it never reads the same twice in a row.
export const WRONG_TAUNTS = [
  'Haha, raté ! Hermès rigole un peu.',
  'Aïe... même une tortue savait celle-là.',
  'Oups. Une plume qui s’envole 😏',
  'Tu peux mieux faire, je le sens.',
  "Ce n'était pas le bon chemin, voyageur.",
  'Hermès note ça dans son carnet...',
];

export const TIMEOUT_TAUNTS = [
  "Trop lent ! Hermès n'attend personne.",
  'Le temps a filé plus vite que toi.',
  'Même ses sandales ont eu le temps de souffler.',
  'Tic-tac... la route n’attend pas.',
  'Un peu de vitesse, voyageur !',
];

export const BETWEEN_TAUNTS = [
  "Prêt pour la suite ? J'en doute un peu 😏",
  'Je garde un œil sur toi...',
  'Impressionne-moi, pour changer.',
  "Ne t'endors pas sur la route !",
  'Hermès sourit. Il sait un truc que tu ne sais pas.',
  'Encore une, si tu l’oses.',
];

export const WRONG_MASCOTS = [mascots.cheekyTaunt, mascots.wrong, mascots.confused];
export const TIMEOUT_MASCOTS = [mascots.timeRunningOut, mascots.waiting, mascots.cheekyTaunt];
export const BETWEEN_MASCOTS = [mascots.cheekyTaunt, mascots.determined, mascots.surprised, mascots.thinking];
export const BETWEEN_TAUNT_CHANCE = 0.45;

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
