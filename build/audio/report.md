# Rapport de pretraitement audio

## Passe 1 — Nettoyage

- Doublon `sfx_chain_pip_4 (1).ogg` deja absent — rien a faire.
- `mus_elan_loop.mp3` existe deja — rien a renommer.
- `equipe_communication.pdf` absent de raw/ — rien a sortir.
- Re-extrait `kenney_casino-audio.zip` dans `raw/kenney/kenney_casino-audio/`.
- Re-extrait `kenney_impact-sounds.zip` dans `raw/kenney/kenney_impact-sounds/`.
- Re-extrait `kenney_interface-sounds.zip` dans `raw/kenney/kenney_interface-sounds/`.
- Re-extrait `kenney_music-jingles.zip` dans `raw/kenney/kenney_music-jingles/`.
- Re-extrait `kenney_ui-audio.zip` dans `raw/kenney/kenney_ui-audio/`.

## Passe 2 — Stingers

| Fichier | Onset retenu (s) | Debut extrait (s) | Duree (s) | LUFS |
|---|---|---|---|---|
| sting_jackpot_final.mp3 | 72.267 | 72.067 | 3.5 | -10.77 |
| sting_victoire_acte1.mp3 | 16.373 | 16.173 | 1.5 | -12.26 |
| sting_victoire_acte2.mp3 | 64.917 | 64.717 | 2.0 | -11.52 |
| sting_victoire_acte3.mp3 | 95.701 | 95.501 | 2.5 | -11.48 |

## Passe 3 — Boucles

| Fichier | Tempo (BPM) | Mesures | Debut (s) | Fin (s) | Duree (s) | LUFS | Score de raccord |
|---|---|---|---|---|---|---|---|
| mus_archive_loop.mp3 | 108.2 | 8 | 27.883 | 45.586 | 17.703 | -13.88 | 48.6% |
| mus_elan_loop.mp3 | 100.4 | 8 | 23.456 | 42.656 | 19.2 | -15.59 | 90.4% |
| mus_menu_loop.mp3 | 92.2 | 16 | 43.904 | 85.642 | 41.738 | -14.01 | 83.8% |
| mus_mur_loop.mp3 | 127.8 | 16 | 165.963 | 195.963 | 30.0 | -14.62 | 95.6% |
| mus_repos_loop.mp3 | 130.8 | 8 | 23.157 | 37.864 | 14.706 | -12.13 | 90.3% |
| mus_route_sacree_loop.mp3 | 100.4 | 8 | 109.899 | 129.104 | 19.205 | -14.17 | 94.6% |

Le score de raccord est une correlation normalisee (0-100%) entre le contenu audio juste avant le point de depart et juste avant le point de fin de la boucle. Plus il est proche de 100%, plus le raccord devrait etre inaudible — mais seule une ecoute des fichiers `*_loopcheck.ogg` (boucle jouee 3 fois d'affilee) confirme reellement l'absence de couture.