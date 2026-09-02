# Sound Design — Chapitre d'Hermès (Niveaux 1 à 10)

Ce document liste tous les sons et musiques nécessaires pour les 10 premiers niveaux du jeu. La quasi-totalité des interactions (timer, réponse juste/fausse, taunts, écran de fin) sont **identiques d'un niveau à l'autre** — on ne doit donc concevoir qu'une seule bibliothèque de SFX partagés, plus une poignée de sons spécifiques par niveau pour ses mécaniques uniques (carrefour, skip, élan/vol, mur, 50/50, jackpot final).

Convention : `[BOUCLE]` = son qui joue en continu/loop, `[UNIQUE]` = déclenché une fois par occurrence, `[OPTIONNEL]` = améliore l'UX mais ne correspond à aucune animation existante dans le code (pas obligatoire pour le MVP).

---

## 1. Musique

| Piste | Où elle joue | Ambiance |
|---|---|---|
| **Thème de la Route Sacrée** `[BOUCLE]` | Fond musical de tous les niveaux 1-5 (Acte 1 — l'appel à l'aventure) | Légère, curieuse, pas de tension — le voyageur découvre la route |
| **Thème de l'Élan / du Vol** `[BOUCLE]` | Superposé ou variante du thème ci-dessus pour les niveaux 5 et 8 pendant une chaîne active | Même thème mais avec percussion additionnelle qui monte en intensité à chaque pip rempli (×1→×2→×3/4) |
| **Thème des Murs** `[BOUCLE]` | Niveaux 6 et 9 (les deux "murs") | Plus sombre, percussif, tendu — basse qui pulse au rythme du timer 7-8s |
| **Thème du Repos** `[BOUCLE]` | Niveau 7 (écran catégorie + questions) | Calme, doux, cordes/harpe — contraste volontaire après le Mur 1 |
| **Thème de l'Archive Finale** `[BOUCLE]` | Niveau 10 | Plus ample, cuivres/chœur léger — sensation de grande finale |
| **Stinger de victoire** `[UNIQUE]` | Transition vers l'écran de complétion, en même temps que le confetti, tous niveaux | Fanfare courte (1-2s), monte en énergie avec le niveau (L1 discret → L10 grandiose) |
| **Stinger du jackpot final** `[UNIQUE]` | Niveau 10, écran "handoff" (révélation cagnotte) | Distinct de tous les autres stingers — le plus grandiose du jeu, doit sonner comme une "porte qui s'ouvre" |

---

## 2. SFX partagés (utilisés sur les 10 niveaux)

C'est la bibliothèque prioritaire — chaque son ci-dessous se déclenche des dizaines de fois par niveau.

| Son | Déclencheur exact dans le code | Fréquence |
|---|---|---|
| **Tap bouton générique** `[UNIQUE]` | Tap sur bouton retour `‹`, bouton "Compris !", bouton "Retour à la carte" / "Continuer" | Très haute |
| **Sélection de réponse** `[UNIQUE]` | Tap sur un choix QCM ou Vrai/Faux, avant révélation | Très haute — une fois par question |
| **Réponse correcte** `[UNIQUE]` | Révélation `choiceCorrect` (bordure/teinte verte) + taunt "⚡ Bonne réponse !" | La plus fréquente de tout le jeu |
| **Réponse fausse** `[UNIQUE]` | Révélation `choiceWrong` (bordure/teinte rouge) + perte de cœur | Très haute |
| **Temps écoulé** `[UNIQUE]` | `onTimeout()` — distinct du son "réponse fausse", même si l'effet visuel est similaire (le joueur n'a pas activement choisi) | Haute |
| **Tic-tac du chrono** `[BOUCLE]` | Pendant toute la durée du `timerAnim` (drain linéaire de la barre), du début de question jusqu'à réponse/timeout | Continue, sur chaque question |
| **Perte de cœur** `[UNIQUE]` | Cœur qui passe à `heartMiniOff` (opacité réduite) — synchronisé avec le son "réponse fausse"/"temps écoulé" mais sonne comme un coup distinct (plus grave, plus lourd) | Haute |
| **Gain de cœur** `[UNIQUE]` | `hearts + 1` (récompense de chaîne réussie en L5/L8) | Rare (2 fois sur les 10 niveaux) |
| **Avancée de question (dot)** `[OPTIONNEL]` | Le point de progression passe de `dotCurrent` à `dotDone` | Haute — subtil "tic" de pas |
| **Apparition mascotte (pop-in)** `[UNIQUE]` | `Animated.spring(pop, ...)` dans `MascotTaunt` — se déclenche à CHAQUE taunt (correct/faux/timeout/entre-questions) | Très haute |
| **Disparition mascotte (pop-out)** `[UNIQUE]` | Fin du `holdMs`, fade+scale-out de la bulle | Très haute (miroir du pop-in) |
| **Ouverture d'overlay (tutoriel/paywall)** `[UNIQUE]` `[OPTIONNEL]` | Montage du `tutorialOverlay`/`tutorialCard` — pas d'animation dans le code actuel, mais un "whoosh" léger à l'apparition améliorerait la lisibilité | Moyenne — une fois par niveau (tutoriel) + occasionnel (paywall des murs) |
| **Confetti / victoire de niveau** `[UNIQUE]` | `ConfettiCannon.start()` à l'entrée en `phase==='complete'` | Une fois par niveau, 10 occurrences |
| **Ouverture écran de fin** `[UNIQUE]` | Transition vers l'écran de complétion (mascotte + titre + score) | Une fois par niveau |

---

## 3. SFX spécifiques par niveau

### Niveau 1 — La Première Borne
Aucun son unique — niveau tutoriel, sert uniquement à poser la bibliothèque partagée ci-dessus.

### Niveau 2 — Le Carrefour
- **Choix de catégorie** `[UNIQUE]` — tap sur une des 3 cartes (Sport/Histoire/Sciences) à l'écran `phase==='category'`. Doit sonner comme une "décision" — plus marqué qu'un tap générique.
- **Bannière verrouillée "Archive d'Athéna"** `[OPTIONNEL]` — un petit son de "verrou" en fond quand la bannière teaser est visible (aucune interaction directe, purement ambiant/décoratif).

### Niveau 3 — Le Messager
- **Bouton Skip (gratuit, 1ère utilisation)** `[UNIQUE]` — tap sur "⏭️ Message d'Hermès" quand `freeSkipUsed` est faux. Léger, aérien (évoque un message qui s'envole).
- **Ouverture du paywall de skip** `[UNIQUE]` — dès la 2e tentative de skip, la carte "Payer 20 🪙" apparaît.
- **Annulation du paywall** `[UNIQUE]` — tap sur "Annuler".
- **Paiement en pièces** `[UNIQUE]` — tap sur "Payer 20 🪙", synchronisé avec la déduction de `coins`. Son de pièces qui tombent/tintent.

### Niveau 4 — Vrai / Faux
Aucun son unique de mécanique — mais le tic-tac du chrono partagé (12s, le plus court hors murs) gagne à être *timbré plus nerveux/rapide* que sur les niveaux 1-3 pour souligner la pression accrue.

### Niveau 5 — L'Élan
- **Incrément de chaîne (pip qui se remplit)** `[UNIQUE]` — à chaque bonne réponse, le pip suivant se colore en or. Son qui monte en hauteur/intensité selon le pip atteint (×1, ×2, ×3) — bâtir un petit "arpège montant" à 3 notes.
- **Chaîne brisée** `[UNIQUE]` — mauvaise réponse OU timeout pendant une chaîne active : pips remis à zéro, streak → 0. Son de "chute"/désaccord, distinct du son "réponse fausse" standard.
- **Élan parfait (objectif atteint)** `[UNIQUE]` — taunt spécial "⚡ Élan parfait !" (mascotte jackpot) + gain de cœur. LE moment de récompense du niveau — doit être le son le plus satisfaisant du niveau, plus riche que le stinger de victoire standard.

### Niveau 6 — 🧱 Mur 1 : La Course d'Hermès
- **Entrée dans le Mur** `[UNIQUE]` `[OPTIONNEL]` — transition depuis le tutoriel vers la 1ère question, un "impact" sonore pour marquer le changement de ton (timer rouge, rythme resserré).
- **Timeout qui coûte un cœur** `[UNIQUE]` — variante plus lourde du son "temps écoulé" standard puisque c'est le premier niveau où le timeout blesse réellement.
- **Écran figé (plus de cœurs)** `[UNIQUE]` — ouverture de l'overlay `frozen`, mascotte `defeat`. Son de "porte qui se verrouille"/déception, distinct du paywall de skip du niveau 3.
- **Paiement pour passer (paywall pièces)** `[UNIQUE]` — même famille sonore que le paiement du niveau 3, mais peut être identique (réutilisation du SFX "paiement en pièces").
- **Achat de cœurs (IAP réel)** `[UNIQUE]` — tap sur "❤️ Recharger 5 cœurs · 0,99 $". Son plus "premium"/cristallin pour bien différencier une transaction réelle d'argent d'une dépense de pièces virtuelles.
- **Victoire du Mur ("les sandales s'embrasent")** `[UNIQUE]` — remplace le stinger de victoire standard : doit sonner plus héroïque/intense (feu, vitesse) qu'un simple "niveau complété".

### Niveau 7 — Le Repos du Voyageur
- **Choix de catégorie** `[UNIQUE]` — identique au SFX du niveau 2 (réutilisation).
- **Révélation du cadeau (50/50 offert)** `[UNIQUE]` — apparition de la carte "🎁 Un cadeau d'Hermès" sur l'écran de fin. Son chaleureux/scintillant, bien différent du stinger de victoire — il annonce un objet gagné pour plus tard (niveau 9), pas juste la fin du niveau.

### Niveau 8 — Le Vol
- **Incrément de chaîne / chaîne brisée** `[UNIQUE]` — même famille sonore que le niveau 5, mais avec 4 paliers au lieu de 3 (ajouter une 4e note à l'arpège montant) et un tempo légèrement plus tendu (timer 10s vs 15s).
- **Vol parfait (objectif atteint, dernier cœur de l'arc)** `[UNIQUE]` — équivalent de "Élan parfait" mais doit sonner comme une progression par rapport au niveau 5 (plus ample), puisque le texte du jeu insiste sur le fait que c'est "le dernier cœur offert".

### Niveau 9 — 🧱 Mur 2 : Le Seuil
- **Utilisation du 50/50** `[UNIQUE]` — tap sur "🍀 50/50" : deux réponses passent en `choiceOut` (grisées, barrées). Son de "sélection/élimination", net et rapide (deux "clacs" rapprochés pour les 2 options éliminées).
- **Échec de la tentative (sudden death)** `[UNIQUE]` — `failAttempt()` : la progression revient à la question 1. Son de "réinitialisation" distinct du son "réponse fausse" standard — doit clairement communiquer "tu recommences", pas juste "mauvaise réponse".
- **Écran figé (plus de cœurs)** `[UNIQUE]` — réutilisation du SFX du niveau 6.
- **Franchissement du Seuil (paiement)** `[UNIQUE]` — variante du paiement standard, mais qui débloque directement l'écran de fin (donc peut enchaîner immédiatement avec le stinger de victoire).
- **Victoire du Seuil** `[UNIQUE]` — stinger de victoire du niveau, dans la même famille sonore "Mur" que le niveau 6 mais avec une résolution plus définitive (c'est le dernier obstacle avant l'Acte 3).

### Niveau 10 — Les Portes de l'Archive
- **Bascule QCM ↔ Vrai/Faux** `[OPTIONNEL]` — un très léger "swap" sonore quand le format de question change d'un type à l'autre, pour souligner que c'est un niveau récapitulatif.
- **Entrée en "Chaîne finale"** `[UNIQUE]` `[OPTIONNEL]` — apparition du label "⚡ Chaîne finale" à partir de la question 5 : un sting court qui marque l'entrée dans le money-time.
- **Écran "Qualifié !"** `[UNIQUE]` — transition `phase==='qualified'`, distincte du stinger de victoire standard des niveaux 1-9 (c'est une étape intermédiaire, pas la fin).
- **Badge "Chaîne finale parfaite"** `[UNIQUE]` — si `chainPerfect` est vrai, un petit son de "sceau/tampon" qui accompagne l'apparition du badge sur l'écran qualifié.
- **Tap "Continuer" → Révélation (handoff)** `[UNIQUE]` — LE moment le plus important du chapitre : `Animated.spring(handoffPop, ...)` fait apparaître la carte du ticket + cagnotte. Un whoosh + un "reveal chime" ample, suivi immédiatement du **stinger du jackpot final** (voir section Musique). C'est le seul `Animated.spring` du fichier hors mascotte — traiter comme la pièce maîtresse sonore de tout le chapitre.
- **Confetti final (140 particules, couleur Athéna)** `[UNIQUE]` — variante plus riche du confetti standard, incluant une texture sonore "dorée/divine" en clin d'œil à l'Archive d'Athéna qui s'annonce pour la suite.

---

## 4. Sons optionnels non couverts par le code actuel

Ces idées amélioreraient l'expérience mais ne correspondent à aucun état/animation existant dans les écrans — à valider avant implémentation, car ils demanderaient d'ajouter la logique correspondante (ex: un état visuel "temps bas") :

- **Alerte "temps bas"** — aucun changement de couleur/état n'existe actuellement quand le chrono approche de 0 (la barre se vide simplement, toujours la même couleur). Un son d'alerte accéléré demanderait soit un ajout de logique (seuil à ~25% du temps restant), soit un simple minutage basé sur `QUESTION_TIME` côté audio uniquement.
- **Compteur de pièces qui s'incrémente/décrémente** — le compteur `🪙 {coins}` se met à jour instantanément (pas d'animation de comptage), donc pas de "cha-ching" progressif à prévoir pour l'instant, seulement un son ponctuel au moment du changement.
- **Ambiance mascotte en idle bob** — le léger flottement continu de la bulle mascotte (`Animated.loop` translateY) est assez subtil pour ne pas nécessiter de son dédié, mais une respiration/bruit blanc très bas pourrait être testé.
