# backend/services/voice_service.py

from faster_whisper import WhisperModel
import librosa
import numpy as np
import re
import os
from dotenv import load_dotenv

load_dotenv()
model = WhisperModel(
    "base",
    device="cpu",
    compute_type="int8"
)

# ── Filler words to detect ──────────────────────────────────────────────────
FILLER_WORDS = [
    "um", "uh", "like", "you know", "basically", "literally",
    "actually", "right", "so", "well", "kind of", "sort of",
    "i mean", "you see", "okay so"
]

# ── 1. Transcription via Whisper ────────────────────────────────────────────
def transcribe_audio(audio_path):
    segments, _ = model.transcribe(audio_path)
    return " ".join(segment.text for segment in segments)


# ── 2. Filler word detection ────────────────────────────────────────────────
def detect_filler_words(transcript: str) -> dict:
    text_lower = transcript.lower()
    counts = {}

    for filler in FILLER_WORDS:
        pattern = r'\b' + re.escape(filler) + r'\b'
        matches = re.findall(pattern, text_lower)
        if matches:
            counts[filler] = len(matches)

    total = sum(counts.values())
    top = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:5]

    word_count = max(len(transcript.split()), 1)
    ratio = total / word_count

    if ratio < 0.04:
        score, feedback = 95, "Excellent — very clean speech with minimal fillers."
    elif ratio < 0.08:
        score, feedback = 78, "Good — a few fillers crept in, but generally clear."
    elif ratio < 0.14:
        score, feedback = 55, "Noticeable fillers — practice pausing instead of 'um/uh'."
    else:
        score, feedback = 30, "Too many fillers — try recording yourself and listening back."

    return {
        "counts": counts,
        "total": total,
        "top": top,
        "score": score,
        "feedback": feedback
    }


# ── 3. Speaking pace ────────────────────────────────────────────────────────
def calculate_pace(transcript: str, duration_secs: float) -> dict:
    words = transcript.split()
    word_count = len(words)
    wpm = round((word_count / duration_secs) * 60) if duration_secs > 0 else 0

    if wpm < 100:
        score, feedback = max(40, int(wpm / 100 * 70)), "Too slow — speed up slightly to maintain energy."
    elif wpm <= 160:
        score, feedback = 95, "Perfect pace — clear, measured, and easy to follow."
    elif wpm <= 185:
        score, feedback = 75, "Slightly fast — take a breath and slow down a touch."
    else:
        score, feedback = max(30, 100 - (wpm - 185)), "Too fast — the listener can't keep up. Breathe more."

    return {
        "wpm": wpm,
        "word_count": word_count,
        "score": score,
        "feedback": feedback
    }


# ── 4. Tone & energy via Librosa ────────────────────────────────────────────
def analyze_tone(audio_path: str) -> dict:
    try:
        y, sr = librosa.load(audio_path, sr=None, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        # Pitch (PYIN — more accurate than YIN for speech)
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
            sr=sr
        )
        voiced_f0 = f0[voiced_flag & ~np.isnan(f0)] if f0 is not None else np.array([])

        mean_pitch    = float(np.mean(voiced_f0))  if voiced_f0.size > 0 else 0.0
        pitch_std     = float(np.std(voiced_f0))   if voiced_f0.size > 0 else 0.0
        voiced_ratio  = float(np.sum(voiced_flag) / len(voiced_flag)) if len(voiced_flag) > 0 else 0.0

        # Energy / volume
        rms = librosa.feature.rms(y=y)[0]
        mean_rms = float(np.mean(rms))

        # Pitch variation score (low std = monotone)
        if pitch_std < 15:
            tone_score, tone_fb = 35, "Monotone — vary your pitch to sound more engaging and confident."
        elif pitch_std < 40:
            tone_score, tone_fb = 70, "Some variation — a bit more expressiveness will captivate the interviewer."
        else:
            tone_score, tone_fb = 92, "Great vocal variety — sounds confident and naturally expressive."

        # Energy score
        if mean_rms < 0.008:
            energy_score, energy_fb = 45, "Speak louder and more deliberately — project your voice."
        elif mean_rms < 0.04:
            energy_score, energy_fb = 80, "Good volume level."
        else:
            energy_score, energy_fb = 95, "Strong, confident delivery — great presence."

        return {
            "duration": round(duration, 1),
            "pitch": {
                "mean_hz": round(mean_pitch, 1),
                "variation": round(pitch_std, 1),
                "score": tone_score,
                "feedback": tone_fb
            },
            "energy": {
                "level": round(mean_rms * 1000, 2),
                "score": energy_score,
                "feedback": energy_fb
            },
            "voiced_ratio": round(voiced_ratio * 100, 1)
        }

    except Exception as e:
        return {
            "duration": 0,
            "pitch":  {"mean_hz": 0, "variation": 0, "score": 0, "feedback": "Could not analyze pitch."},
            "energy": {"level": 0, "score": 0, "feedback": "Could not analyze energy."},
            "voiced_ratio": 0,
            "error": str(e)
        }


# ── 5. Master function ──────────────────────────────────────────────────────
def analyze_voice(audio_path: str) -> dict:
    transcript = transcribe_audio(audio_path)
    tone_data   = analyze_tone(audio_path)
    filler_data = detect_filler_words(transcript)
    pace_data   = calculate_pace(transcript, tone_data.get("duration", 0))

    overall = round(
        filler_data["score"]         * 0.30 +
        pace_data["score"]           * 0.30 +
        tone_data["pitch"]["score"]  * 0.20 +
        tone_data["energy"]["score"] * 0.20
    )

    return {
        "transcript":   transcript,
        "filler_words": filler_data,
        "pace":         pace_data,
        "tone":         tone_data,
        "overall_score": overall
    }