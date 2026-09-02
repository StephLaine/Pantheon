// mini-story spanning Levels 1-10 (Hermès' Trailhead) — the player is the
// hero. A classic three-act arc layered on top of the existing mechanics:
// Act 1 (1-5) the call to adventure and learning the road; Act 2 (6-9) the
// first real trial, a respite, a greater trial, and the final gate; Act 3
// (10) triumph and the handoff to Athena. Each level gets a one-time intro
// beat (shown alongside its existing rules explanation) and a short outro
// line folded into its completion screen.
export const STORY: Record<number, { title: string; intro: string; outro: string }> = {
  1: {
    title: 'Le Voyageur Inconnu',
    intro:
      "Tu es un inconnu, sans nom qui compte encore. Hermès t'a repéré au bord de la Route Sacrée et, pour une raison qu'il garde pour lui, a décidé de faire de toi quelque chose de plus.",
    outro: "Ta première borne s'illumine. Hermès hoche la tête : « Pas mal, pour un début. La route continue. »",
  },
  2: {
    title: 'Le Carrefour',
    intro: 'Le chemin se divise en trois. Hermès, maître des carrefours, veut savoir quel voyageur tu es vraiment.',
    outro: 'Le carrefour est franchi. Ton choix vient de te définir — pour l’instant.',
  },
  3: {
    title: 'Le Secret du Messager',
    intro: '« Un bon messager sait quand porter un message... et quand le confier à quelqu’un d’autre. » Hermès te glisse un clin d’œil espiègle.',
    outro: "Tu viens d'apprendre le premier secret d'Hermès : on n'a pas toujours à tout porter seul.",
  },
  4: {
    title: 'Vrai ou Faux',
    intro: 'La route se resserre. Plus de place pour hésiter — chaque pas doit être vrai, ou faux. Hermès accélère, et toi avec lui.',
    outro: 'Ton jugement s’aiguise. Hermès sourit : « Tu commences à sentir le rythme. »',
  },
  5: {
    title: "L'Élan",
    intro: 'Quelque chose change en toi. Tes pas trouvent un rythme, une confiance. Hermès appelle ça « l’élan » — l’instant où un voyageur devient un coureur.',
    outro: "Ton élan te porte. Une plume dorée tombe des sandales d'Hermès — un cadeau, pour la suite.",
  },
  6: {
    title: "🧱 La Course d'Hermès",
    intro: "Hermès s'arrête. Pour la première fois, son sourire disparaît. « Ici, je ne guide plus. Je cours. Suis-moi, si tu peux. » C'est la première vraie épreuve.",
    outro: "Tu as tenu la cadence d'un dieu. Les sandales d'Hermès s'embrasent — et, un instant, les tiennes aussi.",
  },
  7: {
    title: 'Le Repos du Voyageur',
    intro: "Hermès s'assoit sur une borne, essoufflé de t'avoir vu tenir sa cadence. « Repose-toi, héros. Même les dieux ont besoin d'une pause. »",
    outro: 'Hermès glisse quelque chose dans ta main avant de repartir : un tour de passe-passe, pour le jour où tu en auras besoin.',
  },
  8: {
    title: 'Le Vol',
    intro: '« Le Vol, dit Hermès, c’est le mot que j’utilise pour deux choses : voler dans les airs... et voler ce qu’on ne devrait pas pouvoir prendre. Aujourd’hui, tu voles vraiment. »',
    outro: "Quatre pas parfaits, sans une seule chute. Hermès t'offre un dernier cœur — le dernier cadeau avant le seuil.",
  },
  9: {
    title: '🧱 Le Seuil',
    intro: "Devant toi se dresse Le Seuil, la frontière qu'Hermès garde depuis toujours. « Une seule erreur, et tu recommences. Le seuil ne pardonne pas. Mais toi, tu es prêt. »",
    outro: "Le Seuil s'efface devant toi. Un dieu n'est jamais vraiment surpris — mais Hermès s'en approche.",
  },
  10: {
    title: "Les Portes de l'Archive",
    intro: "Le dernier tronçon de la Route d'Hermès. Plus de nouvelles règles à apprendre — seulement tout ce que tu as déjà prouvé. « Montre-moi qui tu es devenu » dit Hermès.",
    outro: "Hermès s'efface. Il t'a guidé jusqu'au seuil — la suite ne lui appartient plus.",
  },
};
