 — Gameplay détaillé, Niveaux 1 à 10
## Thème : PANTHÉON · Patron des niveaux 1–10 : **HERMÈS**

Hermès — dieu des routes, des voyageurs, de la vitesse, du commerce et des jeux de hasard ; **guide** qui mène le joueur jusqu'aux portes de l'Archive d'Athéna.

Le parcours solo est **La Route d'Hermès**. Chaque niveau est une **borne** (*herma*, la pierre de route dédiée à Hermès). Une bonne réponse **fait avancer** le joueur sur la route ; une mauvaise le fait **trébucher** et lui coûte un cœur (visuellement, une plume de ses sandales ailées).

> Structure Panthéon: Hermès ouvre le voyage (niveaux 1–10, le guide). Les chapitres suivants (Athéna 🦉, Poséidon, Arès, Zeus) s'enchaînent ensuite, dix niveaux à la fois. Hermès est le bon dieu d'entrée: c'est le psychopompe, celui qui **guide** — donc celui qui t'apprend à jouer et te mène au seuil de l'Archive d'Athéna.

---

## Habillage Hermès des mécaniques (le fond ne change pas)

| Mécanique (inchangée) | Habillage Hermès |
|-----------------------|------------------|
| Jauge de score / charge | **Faveur d'Hermès** : le caducée s'illumine, les sandales battent plus vite |
| Cœurs ❤️ (×3) | Visuellement présentés comme des **plumes** des sandales ailées — perds tes cœurs, tu ne peux plus voler → **gel** |
| Bonne réponse | Éclat doré, les ailes claquent, on file sur la route, *whoosh* |
| Mauvaise réponse | Le joueur trébuche, une plume tombe (visuel), **−1 ❤️** |
| Nœud de niveau | **Borne d'Hermès** qui s'allume au passage |
| Déblocage Archive d'Athéna (niv. 10) | **Les portes de l'Archive s'ouvrent** |

> Décision (compatibilité avec l'app déjà codée) : on garde ❤️ **cœurs** comme mécanique et terme partout — l'app affiche déjà des cœurs (barre de cœurs, modal d'achat « Refill 5 hearts / Unlimited hearts », plafond visuel ×3 avec badge au-delà). « Plume » reste un mot d'ambiance dans les descriptions d'Hermès, jamais le nom de la mécanique ni une icône séparée.

---

## Règles universelles (identiques à avant)

**Écran de question.** La barre de chrono est la **traînée de vitesse** d'Hermès qui s'estompe. 4 choix en boutons.
**Bonne réponse.** Éclat doré, on avance, la Faveur monte, on enchaîne.
**Mauvaise réponse.** Trébuchement, **−1 ❤️**, on passe **quand même** à la question suivante.
**Réussite = cœurs.** Finir le niveau avec **≥ 1 ❤️**. Tomber à **0** → **gel** (progression conservée, avancer impossible sans payer). Le **score ne verrouille rien** (sauf chaîne / mort subite).
**Chrono.** Généreux sur niveaux faciles (invisible pour l'honnête, anti-triche), serré sur les murs. Temps écoulé: sans coût sur niveaux faciles ; **coûte un cœur aux murs**.
**À 0 cœur.** Gel → boutique (récupérer 1 cœur / packs / skip payant) → sinon reconquête ~1 j plus tard (rare, plafonnée).

---

## NIVEAU 1 — La Première Borne
**Format:** QCM 4 choix · **5 questions** · **Chrono ~20 s, généreux**
- But: apprendre à jouer + comprendre que trébucher coûte un cœur.
- 1er lancement: overlay **« ⚡ Bonne réponse = tu voles · ❌ Mauvaise réponse = −1 ❤️ »**, Hermès en guide.
- Timeout: question ratée, **pas** de cœur perdu.
- Rythme lent, félicitations appuyées. Le joueur finit en se sentant capable.

## NIVEAU 2 — Le Carrefour
**Format:** choix de catégorie + QCM · **5 questions** · **Chrono généreux**
- Hermès, dieu des carrefours: **3 routes/catégories** à choisir (⚽ Sport · 📜 Histoire · 🔬 Sciences).
- 5 QCM dans la voie choisie. Data sur les goûts du marché.
- Bannière **« 🔒 Archive d'Athéna — Borne 10 »** en bord d'écran.

## NIVEAU 3 — Le Messager (le Skip)
**Format:** QCM · **5 questions** · **Chrono généreux**
- Bouton **⏭️ Message d'Hermès** (skip) apparaît. Overlay: *« Bloqué ? Hermès porte ta question ailleurs. »*
- **1 skip gratuit** offert. Après usage → **prix affiché (20 pièces)**.
- 🎁 Skip enseigné ici, bien avant d'en avoir vraiment besoin.

## NIVEAU 4 — Vrai / Faux
**Format:** affirmation + **VRAI / FAUX** · **6 affirmations** · **Chrono ~12 s**
- Plus rapide, binaire, nerveux. Prépare la vitesse du mur 6.
- Mauvaise réponse: −1 ❤️. Timeout: raté sans coût.
- Premier niveau où un joueur moyen perd son 1ᵉʳ cœur — voulu.

## NIVEAU 5 — L'Élan (chaîne, intro douce)
**Format:** chaîne · **objectif: 3 bonnes d'affilée** · **Chrono moyen**
- Compteur de **vitesse ⚡×1 → ×2 → ×3** : la traînée d'Hermès s'allonge à chaque bonne réponse.
- Version douce: casser la chaîne = **−1 ❤️** mais le compteur repart de zéro, sans autre punition.
- Réussite: atteindre une chaîne de 3.
- 🎁 **Fin: 1 CŒUR gratuit (❤️ → 4).** Amorce le mur du niveau 6.

## NIVEAU 6 — 🧱 MUR 1 · La Course d'Hermès
**Format:** speed round · **7 questions rapides** · **Chrono SERRÉ ~7 s**
- Domaine propre d'Hermès: la vitesse. Traînée qui s'efface vite, tension max.
- **Timeout COÛTE un cœur ici.** Dur par la pression, pas par des questions injustes.
- 💰 **Conversion principale.** Drain ~3. À 0 → gel + boutique + **skip payant** sur la question qui bloque.
- Réussite → **les sandales s'embrasent**, *« Hermès t'a porté 💨 »*. Récompense émotionnelle qui compense le paiement.

## NIVEAU 7 — Le Repos du Voyageur
**Format:** catégorie au choix, détendu · **5 questions** · **Chrono relâché**
- Retour au calme *exprès*. Jamais deux murs de suite. Le payeur récent a besoin d'une victoire facile.
- 🎁 **Fin: 1 « 50/50 » gratuit** — *« Hermès écarte deux fausses pistes. »* Enseigné ici, utile au mur 9.

## NIVEAU 8 — Le Vol (chaîne, vraie)
**Format:** chaîne · **objectif: 4 bonnes d'affilée** · **Chrono moyen-serré**
- La chaîne compte: casser = **−1 ❤️** *et* compteur à zéro → re-enchaîner, plus d'exposition. Drain ~1.
- Sentiment de *presque* (« j'avais 3, raté la 4ᵉ ») honnête, non truqué.
- 🎁 **Fin: 1 CŒUR gratuit.** Dernier offert → amorce le mur 9.
- Bannière: **« Borne 8/10 — l'Archive d'Athéna est proche 🦉 »**.

## NIVEAU 9 — 🧱 MUR 2 · Le Seuil (mort subite)
**Format:** mort subite · **survivre à 5 questions** · **Chrono serré ~8 s**
- Hermès garde les seuils et frontières. Ici: **une seule erreur met fin à la tentative**, coûte **−1 ❤️**, le niveau se rejoue (parcours conservé).
- Le **50/50** (niv. 7) et les objets accumulés se jouent ici — leur moment. Drain ~2.
- 💰 2ᵉ conversion. Sunk cost + Archive à portée = motivation de payer max.

## NIVEAU 10 — 🎓 Les Portes de l'Archive
**Format:** MIXTE (best-of de tous les formats) · **6 questions** · **Chrono modéré**
- QCM + Vrai/Faux + mini-chaîne : récap de tout l'apprentissage. Une **finale**, pas un mur.
- Difficulté « gratifiante », drain bas. Dernière question = **fierté haïtienne facile**.
- 🏆 **Réussite → LES PORTES DE L'ARCHIVE D'ATHÉNA S'OUVRENT.** Hermès s'efface, il t'a guidé jusqu'au seuil, où Athéna prend le relais. Animation maximale, *« Tu es qualifié. »*
- 💡 **Handoff:** révélation du ticket, présenté comme l'aboutissement — **« Ticket: X pièces · Cagnotte en direct: XXXX 🏆 »**. Ticket petit, cagnotte grande et visible.

---

## Récap des mécaniques par niveau

| Niv | Nom (Hermès) | Format | Chrono | Timeout coûte un cœur ? | Objet | Cadeau |
|-----|--------------|--------|--------|:---:|-------|--------|
| 1 | La Première Borne | QCM | Généreux | Non | tuto cœurs | — |
| 2 | Le Carrefour | Catégorie + QCM | Généreux | Non | choix catégorie | — |
| 3 | Le Messager | QCM | Généreux | Non | skip | 🎁 Skip |
| 4 | Vrai/Faux | Vrai/Faux | Court | Non | décision rapide | — |
| 5 | L'Élan | Chaîne douce | Moyen | Non | chaîne | 🎁 Cœur |
| 6 | 🧱 La Course d'Hermès | Speed | **Serré** | **Oui** | pression | — |
| 7 | Le Repos du Voyageur | Catégorie détendu | Relâché | Non | 50/50 | 🎁 50/50 |
| 8 | Le Vol | Chaîne vraie | Moyen-serré | Non | chaîne à enjeu | 🎁 Cœur |
| 9 | 🧱 Le Seuil | Mort subite | **Serré** | **Oui** | tout | — |
| 10 | Les Portes de l'Archive | Mixte (finale) | Modéré | Non | récap | 🏆 Chapitre 2 |

**Cohérence économie:** cadeaux = 2 cœurs (niv. 5, 8) + skip (3) + 50/50 (7). Aucune pièce offerte, aucun bonus permanent. Drain concentré aux murs (6, 9). Objet toujours enseigné gratuitement **avant** le niveau où il devient payant et nécessaire.

## À caler ensuite
- Valeurs exactes des chronos (seuil « mémoire » vs « recherche »).
- Rythme de la mort subite au niveau 9 (tentatives avant gel).
- Banque de questions élargie (>5/niveau) pour la rotation.
- Les 2 chiffres du tournoi (prix ticket, part reversée) vers lesquels pointe le niveau 10.
