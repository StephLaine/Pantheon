"""
Pretraitement audio pour le chapitre d'Hermes (niveaux 1-10).

Trois passes, decrites dans AUDIO_ASSETS_BRIEF.md :
  1. Nettoyage du dossier de livraison brute (raw/).
  2. Stingers : onset + pic d'energie -> extrait court, fade-out, export .ogg.
  3. Boucles : tempo/beats -> meilleure section de 8 ou 16 mesures dont le
     raccord est valide par correlation locale, crossfade court, export .ogg.

Rien n'est jamais ecrit par-dessus un fichier source original : toutes les
sorties vont dans build/audio/. La passe de nettoyage modifie raw/ elle-meme
(c'est son role : dedupe/renomme/decompresse), mais ne detruit aucun contenu
unique (le doublon supprime est verifie octet-a-octet avant suppression).

Usage:
    python3 tools/audio_prep.py [--raw-dir raw] [--build-dir build/audio]
"""

import argparse
import hashlib
import shutil
import subprocess
import zipfile
from pathlib import Path

import librosa
import numpy as np
import pyloudnorm as pyln
import soundfile as sf

# --- cibles issues du brief -------------------------------------------------

STINGER_TARGET_DURATIONS = {
    "sting_victoire_acte1": 1.5,
    "sting_victoire_acte2": 2.0,
    "sting_victoire_acte3": 2.5,
    "sting_jackpot_final": 3.5,
}

LOOP_BAR_CANDIDATES = [8, 16]  # mesures candidates, en 4/4
LOOP_CROSSFADE_S = 0.05
LOOP_HEAD_SKIP_FRAC = 0.10  # on ignore l'intro/outro pour eviter les sections non representatives
LOOP_TAIL_SKIP_FRAC = 0.10
LOOP_SEAM_MATCH_WINDOW_S = 0.35
LOOP_SEAM_SEARCH_S = 0.08

STINGER_ONSET_PREROLL_S = 0.2
STINGER_FADE_OUT_S = 0.2

OGG_QUALITY = "6"  # q:a, coherent avec les sfx deja livres dans le brief
# Ce build de ffmpeg n'a pas ete compile avec --enable-libvorbis : on utilise
# l'encodeur "vorbis" natif de ffmpeg (marque experimental, -strict -2 requis).
OGG_CODEC_ARGS = ["-c:a", "vorbis", "-strict", "-2", "-q:a", OGG_QUALITY]


# --- utilitaires -------------------------------------------------------------

def sh(cmd):
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg a echoue: {' '.join(cmd)}\n{result.stderr}")
    return result


def probe_duration(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(path)],
        capture_output=True, text=True,
    )
    return float(out.stdout.strip())


def measure_lufs(path: Path) -> float:
    data, rate = sf.read(str(path))
    meter = pyln.Meter(rate)
    return meter.integrated_loudness(data)


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


# --- passe 1 : nettoyage -----------------------------------------------------

def pass1_cleanup(raw_dir: Path) -> list:
    """Nettoie raw/ en place. Retourne la liste des actions effectuees (str)."""
    actions = []

    # 1. doublon exact -> supprime seulement si verifie octet-a-octet identique
    dup = raw_dir / "sfx_chain_pip_4 (1).ogg"
    canonical = raw_dir / "sfx_chain_pip_4.ogg"
    if dup.exists() and canonical.exists():
        if file_sha256(dup) == file_sha256(canonical):
            dup.unlink()
            actions.append(f"Supprime le doublon exact `{dup.name}` (identique octet-a-octet a `{canonical.name}`).")
        else:
            actions.append(f"ATTENTION: `{dup.name}` existe mais differe de `{canonical.name}` — non supprime, a verifier manuellement.")
    elif dup.exists() and not canonical.exists():
        actions.append(f"`{dup.name}` trouve sans fichier canonique correspondant — laisse en place, a examiner.")
    else:
        actions.append(f"Doublon `{dup.name}` deja absent — rien a faire.")

    # 2. renommage
    old_name = raw_dir / "mus_elan_loop_lv1.mp3"
    new_name = raw_dir / "mus_elan_loop.mp3"
    if old_name.exists() and not new_name.exists():
        old_name.rename(new_name)
        actions.append(f"Renomme `{old_name.name}` en `{new_name.name}`.")
    elif new_name.exists():
        actions.append(f"`{new_name.name}` existe deja — rien a renommer.")
    else:
        actions.append(f"`{old_name.name}` introuvable — rien a renommer.")

    # 3. sortir le pdf hors-sujet (deplace, jamais supprime)
    pdf = raw_dir / "equipe_communication.pdf"
    if pdf.exists():
        misc_dir = raw_dir.parent / "_out_of_raw"
        misc_dir.mkdir(exist_ok=True)
        dest = misc_dir / pdf.name
        shutil.move(str(pdf), str(dest))
        actions.append(f"Deplace `{pdf.name}` hors de raw/ vers `{dest.relative_to(raw_dir.parent)}` (sans rapport avec l'audio).")
    else:
        actions.append("`equipe_communication.pdf` absent de raw/ — rien a sortir.")

    # 4. decompression des packs Kenney
    kenney_dir = raw_dir / "kenney"
    kenney_dir.mkdir(exist_ok=True)
    zips = sorted(raw_dir.glob("kenney_*.zip"))
    if not zips:
        actions.append("Aucune archive `kenney_*.zip` trouvee dans raw/.")
    for zpath in zips:
        target = kenney_dir / zpath.stem
        already = target.exists() and any(target.iterdir())
        with zipfile.ZipFile(zpath) as zf:
            zf.extractall(target)
        actions.append(f"{'Re-extrait' if already else 'Extrait'} `{zpath.name}` dans `{target.relative_to(raw_dir.parent)}/`.")

    return actions


# --- passe 2 : stingers -------------------------------------------------------

def process_stinger(path: Path, build_dir: Path) -> dict:
    target_dur = STINGER_TARGET_DURATIONS.get(path.stem)
    if target_dur is None:
        raise ValueError(f"Aucune duree cible connue pour {path.name} — ajouter une entree dans STINGER_TARGET_DURATIONS.")

    y, sr = librosa.load(str(path), sr=None, mono=True)
    total_dur = len(y) / sr

    onset_frames = librosa.onset.onset_detect(y=y, sr=sr, backtrack=True)
    onset_times = librosa.frames_to_time(onset_frames, sr=sr)

    rms = librosa.feature.rms(y=y)[0]
    rms_times = librosa.frames_to_time(np.arange(len(rms)), sr=sr)
    peak_t = float(rms_times[int(np.argmax(rms))])

    prior_onsets = onset_times[onset_times <= peak_t]
    onset_t = float(prior_onsets[-1]) if len(prior_onsets) else max(0.0, peak_t - 0.05)

    start_t = max(0.0, onset_t - STINGER_ONSET_PREROLL_S)
    if start_t + target_dur > total_dur:
        start_t = max(0.0, total_dur - target_dur)

    out_path = build_dir / "music" / f"{path.stem}.ogg"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fade_start = max(0.0, target_dur - STINGER_FADE_OUT_S)
    sh([
        "ffmpeg", "-y", "-ss", f"{start_t:.3f}", "-t", f"{target_dur:.3f}", "-i", str(path), "-vn",
        "-af", f"afade=t=out:st={fade_start:.3f}:d={STINGER_FADE_OUT_S}",
        *OGG_CODEC_ARGS, str(out_path),
    ])

    return {
        "file": path.name,
        "out": out_path,
        "peak_energy_t": round(peak_t, 3),
        "onset_t": round(onset_t, 3),
        "extract_start_t": round(start_t, 3),
        "duration_s": round(target_dur, 3),
        "lufs": round(measure_lufs(out_path), 2),
    }


# --- passe 3 : boucles ---------------------------------------------------------

def _window(y: np.ndarray, sr: int, start_t: float, end_t: float) -> np.ndarray:
    a = max(0, int(start_t * sr))
    b = min(len(y), int(end_t * sr))
    return y[a:b]


def seam_score(y: np.ndarray, sr: int, start_t: float, end_t: float):
    """Correlation locale entre le contenu autour du debut et de la fin d'une
    boucle candidate. Renvoie (score 0..1, end_t affine pour un raccord optimal)."""
    half = LOOP_SEAM_MATCH_WINDOW_S / 2
    ref = _window(y, sr, start_t - half, start_t + half)
    cand = _window(y, sr, end_t - half - LOOP_SEAM_SEARCH_S, end_t + half + LOOP_SEAM_SEARCH_S)
    if len(ref) < 8 or len(cand) < len(ref):
        return 0.0, end_t

    corr = np.correlate(cand, ref, mode="valid")
    ref_norm = np.linalg.norm(ref)
    if ref_norm == 0:
        return 0.0, end_t
    cand_norms = np.sqrt(np.convolve(cand ** 2, np.ones(len(ref)), mode="valid"))
    cand_norms[cand_norms == 0] = 1e-9
    normalized = corr / (ref_norm * cand_norms)

    best_lag = int(np.argmax(normalized))
    best_score = float(np.clip(normalized[best_lag], -1.0, 1.0))

    search_start_sample = int((end_t - half - LOOP_SEAM_SEARCH_S) * sr)
    refined_end_t = (search_start_sample + best_lag + len(ref) / 2) / sr
    return max(0.0, best_score), refined_end_t


def process_loop(path: Path, build_dir: Path) -> dict:
    y, sr = librosa.load(str(path), sr=None, mono=True)
    total_dur = len(y) / sr

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    tempo = float(np.asarray(tempo).item())
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)

    lo = total_dur * LOOP_HEAD_SKIP_FRAC
    hi = total_dur * (1 - LOOP_TAIL_SKIP_FRAC)

    best = None  # (score, start_t, refined_end_t, bars, length_beats)
    for bars in LOOP_BAR_CANDIDATES:
        length_beats = bars * 4  # 4/4
        if length_beats >= len(beat_times):
            continue
        for i in range(len(beat_times) - length_beats):
            start_t = float(beat_times[i])
            end_t = float(beat_times[i + length_beats])
            if start_t < lo or end_t > hi:
                continue
            score, refined_end_t = seam_score(y, sr, start_t, end_t)
            if best is None or score > best[0]:
                best = (score, start_t, refined_end_t, bars, length_beats)

    if best is None:
        # repli : pas de beats exploitables, on prend une section centrale de 30s
        start_t = total_dur * 0.3
        refined_end_t = start_t + 30.0
        best = (0.0, start_t, refined_end_t, None, None)

    score, start_t, end_t, bars, length_beats = best
    loop_len = end_t - start_t
    x = LOOP_CROSSFADE_S

    out_path = build_dir / "music" / f"{path.stem}.ogg"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    filt = (
        f"[0:a]atrim=0:{x},asetpts=PTS-STARTPTS[head];"
        f"[0:a]atrim={x}:{loop_len},asetpts=PTS-STARTPTS[middle];"
        f"[0:a]atrim={loop_len}:{loop_len + x},asetpts=PTS-STARTPTS[tail];"
        f"[tail][head]acrossfade=d={x}[seam];"
        f"[middle][seam]concat=n=2:v=0:a=1[out]"
    )
    sh([
        "ffmpeg", "-y", "-ss", f"{start_t:.3f}", "-t", f"{loop_len + x:.3f}", "-i", str(path), "-vn",
        "-filter_complex", filt, "-map", "[out]",
        *OGG_CODEC_ARGS, str(out_path),
    ])

    loopcheck_path = build_dir / "music" / f"{path.stem}_loopcheck.ogg"
    sh([
        "ffmpeg", "-y", "-stream_loop", "2", "-i", str(out_path), "-vn",
        *OGG_CODEC_ARGS, str(loopcheck_path),
    ])

    return {
        "file": path.name,
        "out": out_path,
        "loopcheck": loopcheck_path,
        "tempo_bpm": round(tempo, 1),
        "bars": bars,
        "start_t": round(start_t, 3),
        "end_t": round(end_t, 3),
        "duration_s": round(loop_len, 3),
        "lufs": round(measure_lufs(out_path), 2),
        "seam_score_pct": round(score * 100, 1),
    }


# --- rapport ------------------------------------------------------------------

def write_report(build_dir: Path, cleanup_actions: list, stingers: list, loops: list):
    lines = ["# Rapport de pretraitement audio", ""]

    lines += ["## Passe 1 — Nettoyage", ""]
    for a in cleanup_actions:
        lines.append(f"- {a}")
    lines.append("")

    lines += ["## Passe 2 — Stingers", "", "| Fichier | Onset retenu (s) | Debut extrait (s) | Duree (s) | LUFS |", "|---|---|---|---|---|"]
    for s in stingers:
        lines.append(f"| {s['file']} | {s['onset_t']} | {s['extract_start_t']} | {s['duration_s']} | {s['lufs']} |")
    lines.append("")

    lines += [
        "## Passe 3 — Boucles", "",
        "| Fichier | Tempo (BPM) | Mesures | Debut (s) | Fin (s) | Duree (s) | LUFS | Score de raccord |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for l in loops:
        bars = l["bars"] if l["bars"] is not None else "repli (pas de beats fiables)"
        lines.append(
            f"| {l['file']} | {l['tempo_bpm']} | {bars} | {l['start_t']} | {l['end_t']} | "
            f"{l['duration_s']} | {l['lufs']} | {l['seam_score_pct']}% |"
        )
    lines.append("")
    lines.append(
        "Le score de raccord est une correlation normalisee (0-100%) entre le contenu "
        "audio juste avant le point de depart et juste avant le point de fin de la boucle. "
        "Plus il est proche de 100%, plus le raccord devrait etre inaudible — mais seule "
        "une ecoute des fichiers `*_loopcheck.ogg` (boucle jouee 3 fois d'affilee) confirme "
        "reellement l'absence de couture."
    )

    (build_dir / "report.md").write_text("\n".join(lines), encoding="utf-8")


# --- main -----------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Pretraitement audio (stingers + boucles) pour le chapitre d'Hermes.")
    parser.add_argument("--raw-dir", default="raw")
    parser.add_argument("--build-dir", default="build/audio")
    args = parser.parse_args()

    raw_dir = Path(args.raw_dir).resolve()
    build_dir = Path(args.build_dir).resolve()
    build_dir.mkdir(parents=True, exist_ok=True)

    print(f"[1/3] Nettoyage de {raw_dir} ...")
    cleanup_actions = pass1_cleanup(raw_dir)
    for a in cleanup_actions:
        print(f"  - {a}")

    print("[2/3] Stingers ...")
    stingers = []
    for path in sorted(raw_dir.glob("sting_*.mp3")):
        info = process_stinger(path, build_dir)
        stingers.append(info)
        print(f"  - {info['file']}: extrait a {info['extract_start_t']}s, {info['duration_s']}s, {info['lufs']} LUFS -> {info['out'].name}")

    print("[3/3] Boucles ...")
    loops = []
    for path in sorted(raw_dir.glob("mus_*.mp3")):
        info = process_loop(path, build_dir)
        loops.append(info)
        print(
            f"  - {info['file']}: {info['tempo_bpm']} BPM, {info['bars']} mesures, "
            f"[{info['start_t']}s -> {info['end_t']}s] ({info['duration_s']}s), "
            f"raccord {info['seam_score_pct']}%, {info['lufs']} LUFS -> {info['out'].name} (+ {info['loopcheck'].name})"
        )

    write_report(build_dir, cleanup_actions, stingers, loops)
    print(f"\nRapport ecrit dans {build_dir / 'report.md'}")


if __name__ == "__main__":
    main()
