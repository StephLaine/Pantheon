# Brief audio — Chapitre d'Hermès (KwizKach, niveaux 1 à 10)

Document de passation pour l'intégration audio. Il décrit chaque fichier présent dans le dossier de livraison, ce qu'il déclenche dans le code, et le travail de préparation restant.

Convention de nommage : `mus_` = boucle musicale, `sting_` = stinger ponctuel non bouclé, `sfx_` = effet sonore court. Tout en minuscules, underscores, sans accents.

---

## 1. À faire avant intégration (blocages)

Ces trois points doivent être réglés en premier, aucun fichier musical n'est prêt à être consommé tel quel.

### 1.1 Les stingers ne sont pas découpés

`sting_victoire_acte1.mp3`, `sting_victoire_acte2.mp3`, `sting_victoire_acte3.mp3` et `sting_jackpot_final.mp3` pèsent 2,6 à 5,5 Mo chacun. Ce sont des générations Suno brutes de 2 à 4 minutes. Un stinger doit durer 1,5 à 3 secondes.

Travail requis : écouter chaque fichier, repérer le passage de fanfare le plus net, extraire, ajouter un fade-out de 150 à 200 ms pour éliminer le clic de coupe.

```bash
ffmpeg -i sting_victoire_acte1.mp3 -ss <DEBUT> -t <DUREE> \
  -af "afade=t=out:st=<DUREE-0.2>:d=0.2" -c:a libvorbis -q:a 6 \
  sting_victoire_acte1.ogg
```

Durées cibles : acte1 1,5 s, acte2 2 s, acte3 2,5 s, jackpot 3 à 4 s.

### 1.2 Les boucles ne sont pas bouclées

Les cinq `mus_*.mp3` sont également des générations brutes. Il faut isoler une section de 30 à 45 secondes qui reboucle sans couture audible : couper sur un temps fort, vérifier que la fin enchaîne sur le début sans trou rythmique ni changement de texture.

Le point de vigilance est `mus_archive_loop.mp3` : les fanfares de cuivres finissent souvent sur une résolution qui sonne comme une fin de morceau. Privilégier une section où le motif tourne en cycle.

### 1.3 Nettoyage du dossier

| Fichier | Action |
|---|---|
| `sfx_chain_pip_4 (1).ogg` | Doublon exact de `sfx_chain_pip_4.ogg`, à supprimer |
| `mus_elan_loop_lv1.mp3` | Renommer en `mus_elan_loop.mp3`, le suffixe `lv1` est un reliquat d'une approche à trois couches d'intensité qui a été abandonnée. Un seul fichier est prévu |
| `kenney_*.zip` (5 fichiers) | À décompresser, les SFX d'interface sont dedans et ne sont pas encore triés |
| `equipe_communication.pdf` | Sans rapport avec l'audio, à sortir du dossier |

---

## 2. Musiques de fond (boucles)

Une seule boucle joue à la fois. Démarrage à l'entrée du niveau, arrêt ou fondu descendant à l'entrée en `phase==='complete'`. Toutes ces pistes partagent la tonique D pour que les transitions entre niveaux ne heurtent pas.

| Fichier | Niveaux | Déclenchement | Caractère |
|---|---|---|---|
| `mus_route_sacree_loop` | 1, 2, 3, 4, 5 | Entrée du niveau, tourne pendant tutoriel + écran catégorie + questions | Léger, curieux, sans tension. 100 BPM, D dorien |
| `mus_elan_loop` | 5, 8 | Dès qu'une chaîne est active. S'arrête quand la chaîne casse ou se complète, retour à la boucle de base | Même ADN mélodique mais percussion motrice. 112 BPM |
| `mus_mur_loop` | 6, 9 | Toute la durée des deux murs, y compris overlay `frozen` et paywalls | Sombre, percussif, basse qui pulse. 128 BPM, D phrygien |
| `mus_repos_loop` | 7 | Écran catégorie + questions, du début à la fin | Calme, harpe et cordes, aucune percussion. 72 BPM, D majeur |
| `mus_archive_loop` | 10 | Entrée du niveau jusqu'à l'écran `qualified` | Ample, cuivres, chœur léger. 108 BPM, D mixolydien |

Note sur `mus_elan_loop` : deux implémentations possibles, remplacement de la boucle de base ou superposition par-dessus. La superposition suppose que les deux pistes soient calées au même tempo et à la même phase, ce qui n'est pas garanti sur des générations Suno indépendantes. Le remplacement avec crossfade de 300 ms est plus sûr.

---

## 3. Stingers (ponctuels, non bouclés)

À leur déclenchement, couper ou baisser de 12 dB la boucle de fond, sinon les deux se marchent dessus.

| Fichier | Déclenchement |
|---|---|
| `sting_victoire_acte1` | Écran de complétion des niveaux 1 à 5. Également recommandé pour le niveau 7 malgré sa position dans l'acte 2, parce qu'un stinger héroïque sonne disproportionné après une boucle de harpe sans percussion |
| `sting_victoire_acte2` | Écran de complétion des niveaux 6, 8, 9 |
| `sting_victoire_acte3` | Écran `phase==='qualified'` du niveau 10 |
| `sting_jackpot_final` | Niveau 10 uniquement, au tap sur « Continuer » qui déclenche le `Animated.spring(handoffPop, ...)` et la révélation de la cagnotte |

Sur `sting_jackpot_final` : c'est la pièce maîtresse sonore du chapitre. Le whoosh d'ouverture doit couvrir le déclenchement du ressort, le grand accord tomber quand la carte du ticket est en place. Si le découpage le permet, séparer en deux fichiers, `sfx_handoff_whoosh` de 0,4 s pour le glissando et `sting_jackpot_final` de 2,5 s pour l'accord et la queue de réverbe.

---

## 4. SFX générés (prêts à l'emploi)

Ces six fichiers sont synthétisés, normalisés, et n'ont besoin d'aucune préparation. Ils sont en `.ogg` Vorbis q6, 44,1 kHz.

| Fichier | Durée | Déclenchement | Détail |
|---|---|---|---|
| `sfx_chain_pip_1` | 0,30 s | Niveaux 5 et 8, 1re bonne réponse d'une chaîne | Note D5, timbre de cloche |
| `sfx_chain_pip_2` | 0,30 s | 2e bonne réponse consécutive | F#5, plus brillant |
| `sfx_chain_pip_3` | 0,30 s | 3e bonne réponse consécutive | A5 |
| `sfx_chain_pip_4` | 0,30 s | 4e bonne réponse, **niveau 8 uniquement** (le niveau 5 s'arrête à 3 paliers) | D6, octave supérieure |
| `sfx_chain_break` | 0,55 s | Mauvaise réponse OU timeout pendant une chaîne active, niveaux 5 et 8. Réutilisable pour `failAttempt()` au niveau 9 | Glissando descendant avec battement dissonant. Volontairement distinct de `sfx_answer_wrong` : communique « chute », pas « erreur » |
| `sfx_timer_tick_loop` | 1,00 s | En boucle pendant toute la durée du `timerAnim`, du début de question jusqu'à réponse ou timeout | Tic à 0 s, tac plus grave à 0,5 s. Durée entière, donc bouclable sans couture. Mixé volontairement bas (peak 0,5) |

Les quatre pips forment un arpège musical cohérent en D mixolydien. Ils doivent être joués dans l'ordre et jamais substitués l'un à l'autre, sinon la montée d'intensité disparaît.

---

## 5. SFX à extraire des packs Kenney

Cinq archives CC0, aucune attribution requise, usage commercial autorisé. Les fichiers sont en `.ogg`.

| Cible | Archive source | Fichiers candidats |
|---|---|---|
| `sfx_tap_generic` | `kenney_interface-sounds.zip` | `click_001` à `click_005`, `switch_00x` |
| `sfx_answer_select` | `kenney_ui-audio.zip` | `rollover1` à `rollover6` |
| `sfx_answer_correct` | `kenney_interface-sounds.zip` | `confirmation_001` et suivants |
| `sfx_answer_wrong` | `kenney_interface-sounds.zip` | `error_00x` |
| `sfx_timeout` | `kenney_interface-sounds.zip` | `bong_001`, `close_00x` grave |
| `sfx_heart_lose` | `kenney_impact-sounds.zip` | un impact mat et grave |
| `sfx_mascot_pop` | `kenney_interface-sounds.zip` | `open_00x`, `pluck_00x` |
| `sfx_coins_pay` | `kenney_casino-audio.zip` | jetons, pièces qui tintent |
| `sfx_confetti` | `kenney_music-jingles.zip` | jingle court et joyeux |

Déclencheurs correspondants dans le code :

- `sfx_tap_generic` — bouton retour `‹`, « Compris ! », « Retour à la carte », « Continuer », et par extension tous les boutons de paywall (skip L3, murs L6 et L9), l'annulation, et le choix de catégorie aux niveaux 2 et 7
- `sfx_answer_select` — tap sur un choix QCM ou Vrai/Faux, avant révélation
- `sfx_answer_correct` — révélation `choiceCorrect`, simultané avec le taunt « Bonne réponse ! ». Le son le plus fréquent du jeu
- `sfx_answer_wrong` — révélation `choiceWrong`
- `sfx_timeout` — `onTimeout()`. Distinct de `sfx_answer_wrong` parce que le joueur n'a pas choisi activement
- `sfx_heart_lose` — cœur qui passe à `heartMiniOff`. Joué en même temps que `sfx_answer_wrong` ou `sfx_timeout`, doit être plus grave et plus lourd pour se superposer sans se confondre
- `sfx_mascot_pop` — `Animated.spring(pop, ...)` dans `MascotTaunt`, à chaque apparition de bulle
- `sfx_coins_pay` — déduction de `coins`, aux niveaux 3, 6 et 9
- `sfx_confetti` — `ConfettiCannon.start()` à l'entrée en `phase==='complete'`

---

## 6. Cible de mixage

- SFX courts : normaliser autour de -16 LUFS
- Musiques : 6 à 8 dB sous les SFX pour qu'elles restent en arrière-plan
- Coupe-bas à 80 Hz sur tous les SFX courts, évite la saturation du haut-parleur de téléphone
- Fade-out de 50 ms minimum sur chaque fichier, supprime les clics de fin
- Format de sortie : `.ogg` Vorbis pour Android, `.m4a` AAC si le moteur audio iOS le préfère. Vérifier ce que consomme la librairie audio du projet avant conversion en masse

---

## 7. Sons volontairement omis du MVP

La spécification complète comptait 41 effets. La liste ci-dessus en couvre 15. Les omissions sont des emprunts assumés, à remplacer plus tard par des sons dédiés :

- Pop-out de la mascotte : la sortie est déjà lisible visuellement
- Avancée du dot de progression : tombe en même temps que `sfx_answer_correct`, deux sons simultanés pour un seul événement
- Gain de cœur : deux occurrences sur dix niveaux, utiliser `sfx_confetti`
- Ouverture d'overlay et écran de fin : couverts par le tap du bouton qui les ouvre et par le confetti
- Élan parfait, vol parfait, victoires de mur, écran figé, achat IAP, 50/50, sudden death, badge « Chaîne finale parfaite », bascule QCM/VF, chaîne finale, bannière verrouillée : tous remplaçables par une combinaison des sons présents

Le cas de l'achat IAP mérite un son dédié dès que possible. Une transaction en argent réel utilisant le même SFX qu'une dépense de pièces virtuelles est un signal trompeur pour le joueur.
