"""
Speech Cognition Classifier — Zero-Shot + Rule-Based Fallback

Primary:  facebook/bart-large-mnli  (zero-shot, no training data needed)
Fallback: Rule-based thresholds from analyze_transcript_nlp metrics
          (used when model is too large / GPU not available)
"""

import os
from analyze_transcript_nlp import analyze_transcript_nlp

# Cognitive marker labels — what the BART model classifies against
LABELS = ["coherent speech", "repetitive speech", "confused speech", "tangential speech"]

# Human-readable short labels returned in the API
LABEL_MAP = {
    "coherent speech":    "COHERENT",
    "repetitive speech":  "REPETITIVE",
    "confused speech":    "CONFUSED",
    "tangential speech":  "TANGENTIAL",
}

DESCRIPTIONS = {
    "COHERENT":    "Speech is organised, on-topic, and shows normal cognitive function.",
    "REPETITIVE":  "Patient frequently repeats phrases or ideas — a common early marker.",
    "CONFUSED":    "Speech is disorganised or loses thread mid-sentence.",
    "TANGENTIAL":  "Patient drifts off-topic unexpectedly during conversation.",
}

# ── Lazy-load BART pipeline ───────────────────────────────────────────────
_pipeline = None
_use_bart  = True   # Set to False after first load failure


def _load_pipeline():
    global _pipeline, _use_bart
    if _pipeline is not None:
        return True
    if not _use_bart:
        return False
    try:
        from transformers import pipeline
        _pipeline = pipeline(
            "zero-shot-classification",
            model="facebook/bart-large-mnli",
            device=-1,  # CPU — change to 0 for GPU
        )
        return True
    except Exception as e:
        print(f"[predict_speech_cognition] BART load failed, using rule-based fallback: {e}")
        _use_bart = False
        return False


# ── Rule-based fallback ────────────────────────────────────────────────────
def _rule_based(nlp_metrics: dict) -> dict:
    """
    Apply clinical-literature thresholds to NLP metrics.
    Returns the same structure as the BART classifier.
    """
    rep   = nlp_metrics.get("repetition_rate", 0)
    div   = nlp_metrics.get("word_diversity", 1)
    inc   = nlp_metrics.get("incomplete_sentence_rate", 0)
    pnr   = nlp_metrics.get("pronoun_noun_ratio", 0)
    dens  = nlp_metrics.get("lexical_density", 1)

    scores = {
        "coherent speech":    0.0,
        "repetitive speech":  min(rep * 5, 1.0),
        "confused speech":    min(inc * 3 + max(0, 1 - dens) * 0.5, 1.0),
        "tangential speech":  min(pnr * 0.4 + max(0, 1 - div) * 0.3, 1.0),
    }

    # Coherent gets what's left
    incoherence = max(scores["repetitive speech"], scores["confused speech"], scores["tangential speech"])
    scores["coherent speech"] = max(0.0, 1.0 - incoherence)

    # Normalise
    total = sum(scores.values()) or 1.0
    scores = {k: round(v / total, 4) for k, v in scores.items()}

    dominant = max(scores, key=scores.__getitem__)
    return scores, dominant


# ── Public classify function ───────────────────────────────────────────────
def classify_transcript(text: str, segments: list = None) -> dict:
    """
    Classify a speech transcript for cognitive markers.

    Returns
    -------
    {
      "dominant_marker": "COHERENT" | "REPETITIVE" | "CONFUSED" | "TANGENTIAL",
      "scores": { "COHERENT": 0.72, "REPETITIVE": 0.10, ... },
      "cognitive_flag": bool,   # True if not COHERENT with prob > 0.45
      "summary": str,           # one-line clinical description
      "method": "bart" | "rule_based",
      "nlp_metrics": { ... }    # from analyze_transcript_nlp
    }
    """
    if not text or len(text.strip().split()) < 5:
        return _insufficient_data()

    # Extract deep NLP metrics regardless of method
    nlp_metrics = analyze_transcript_nlp(text, segments or [])

    # ── Try BART zero-shot first ──────────────────────────────────────────
    if _load_pipeline():
        try:
            result   = _pipeline(text[:512], candidate_labels=LABELS, multi_label=False)
            raw_scores = dict(zip(result["labels"], result["scores"]))
            dominant_long = result["labels"][0]
            dominant = LABEL_MAP[dominant_long]
            short_scores = {LABEL_MAP[k]: round(v, 4) for k, v in raw_scores.items()}
            method = "bart"
        except Exception as e:
            print(f"[predict_speech_cognition] BART inference failed: {e}")
            raw_scores, dominant_long = _rule_based(nlp_metrics)
            dominant = LABEL_MAP[dominant_long]
            short_scores = {LABEL_MAP[k]: round(v, 4) for k, v in raw_scores.items()}
            method = "rule_based"
    else:
        raw_scores, dominant_long = _rule_based(nlp_metrics)
        dominant = LABEL_MAP[dominant_long]
        short_scores = {LABEL_MAP[k]: round(v, 4) for k, v in raw_scores.items()}
        method = "rule_based"

    # Cognitive flag: True if non-coherent marker has >45% probability
    coherent_score = short_scores.get("COHERENT", 1.0)
    cognitive_flag = coherent_score < 0.55

    return {
        "dominant_marker": dominant,
        "scores":          short_scores,
        "cognitive_flag":  cognitive_flag,
        "summary":         DESCRIPTIONS[dominant],
        "method":          method,
        "nlp_metrics":     nlp_metrics,
    }


def _insufficient_data() -> dict:
    return {
        "dominant_marker": "COHERENT",
        "scores": {"COHERENT": 1.0, "REPETITIVE": 0.0, "CONFUSED": 0.0, "TANGENTIAL": 0.0},
        "cognitive_flag": False,
        "summary": "Transcript too short for reliable analysis.",
        "method": "insufficient_data",
        "nlp_metrics": {},
    }
