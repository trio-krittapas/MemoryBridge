"""
Deep NLP Analysis of Speech Transcripts
Extracts cognitive decline markers beyond the basic linguistic metrics.
Called by main.py's /analyze-cognition and /analyze endpoints.
"""

import re
from collections import Counter
from itertools import islice

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
    SPACY_AVAILABLE = True
except Exception:
    SPACY_AVAILABLE = False


def _ngrams(tokens: list, n: int):
    """Yield n-grams from a token list."""
    it = iter(tokens)
    window = tuple(islice(it, n))
    if len(window) == n:
        yield window
    for token in it:
        window = window[1:] + (token,)
        yield window


def analyze_transcript_nlp(text: str, segments: list = None) -> dict:
    """
    Extract deep NLP features from a speech transcript.

    Returns
    -------
    dict with keys:
        repetition_rate       - fraction of 3-grams that repeat (0–1)
        lexical_density       - content words / total words (0–1)
        named_entity_count    - number of named entities detected
        avg_sentence_length   - mean words per sentence
        pronoun_noun_ratio    - pronouns / nouns (high = vague reference)
        negation_count        - number of negation tokens
        sentence_count        - total number of sentences
        word_diversity        - unique lemmas / total tokens (0–1)
        incomplete_sentence_rate - sentences ending mid-way (no verb found)
    """
    if not text or not text.strip():
        return _empty_metrics()

    # ── spaCy path (richer features) ─────────────────────────────────────
    if SPACY_AVAILABLE:
        doc = nlp(text)
        tokens = [t for t in doc if not t.is_space]
        words  = [t for t in tokens if not t.is_punct]

        if not words:
            return _empty_metrics()

        # Repetition rate — 3-gram overlap
        word_texts = [t.text.lower() for t in words]
        trigrams = list(_ngrams(word_texts, 3))
        trigram_counts = Counter(trigrams)
        repeated_trigrams = sum(1 for c in trigram_counts.values() if c > 1)
        repetition_rate = repeated_trigrams / len(trigrams) if trigrams else 0.0

        # Lexical density — content POS tags
        content_pos = {"NOUN", "VERB", "ADJ", "ADV"}
        content_words = [t for t in words if t.pos_ in content_pos]
        lexical_density = len(content_words) / len(words)

        # Named entities
        named_entity_count = len(doc.ents)

        # Sentence-level metrics
        sentences = list(doc.sents)
        sentence_count = len(sentences)
        avg_sentence_length = len(words) / sentence_count if sentence_count else 0

        # Incomplete sentences — sentences with no VERB
        incomplete = sum(
            1 for s in sentences
            if not any(t.pos_ == "VERB" for t in s)
        )
        incomplete_sentence_rate = incomplete / sentence_count if sentence_count else 0

        # Pronoun / noun ratio
        pronouns = [t for t in words if t.pos_ == "PRON"]
        nouns    = [t for t in words if t.pos_ == "NOUN"]
        pronoun_noun_ratio = len(pronouns) / len(nouns) if nouns else 0.0

        # Negation count
        negation_count = sum(1 for t in tokens if t.dep_ == "neg")

        # Word diversity — unique lemmas
        lemmas = [t.lemma_.lower() for t in words if t.lemma_ != "-PRON-"]
        word_diversity = len(set(lemmas)) / len(lemmas) if lemmas else 0.0

    # ── Fallback: regex-only path (no spaCy model) ────────────────────────
    else:
        words = re.findall(r"\b\w+\b", text.lower())
        if not words:
            return _empty_metrics()

        trigrams = list(_ngrams(words, 3))
        trigram_counts = Counter(trigrams)
        repeated_trigrams = sum(1 for c in trigram_counts.values() if c > 1)
        repetition_rate = repeated_trigrams / len(trigrams) if trigrams else 0.0

        sentences = re.split(r"[.!?]+", text)
        sentences = [s.strip() for s in sentences if s.strip()]
        sentence_count = len(sentences)
        avg_sentence_length = len(words) / sentence_count if sentence_count else 0

        fillers = {"um", "uh", "ah", "er", "like", "you", "know", "i", "it", "they", "he", "she"}
        pronouns_approx = sum(1 for w in words if w in {"i", "me", "he", "she", "they", "it", "we", "you"})
        nouns_approx = max(len(words) - pronouns_approx * 2, 1)
        pronoun_noun_ratio = pronouns_approx / nouns_approx

        negation_words = {"not", "no", "never", "n't", "nobody", "nothing", "neither"}
        negation_count = sum(1 for w in words if w in negation_words)

        lexical_density = len(set(words)) / len(words)
        word_diversity  = len(set(words)) / len(words)
        named_entity_count = 0
        incomplete_sentence_rate = 0.0

    return {
        "repetition_rate":         round(repetition_rate, 4),
        "lexical_density":         round(lexical_density, 4),
        "named_entity_count":      named_entity_count,
        "avg_sentence_length":     round(avg_sentence_length, 2),
        "pronoun_noun_ratio":      round(pronoun_noun_ratio, 4),
        "negation_count":          negation_count,
        "sentence_count":          sentence_count,
        "word_diversity":          round(word_diversity, 4),
        "incomplete_sentence_rate": round(incomplete_sentence_rate, 4),
    }


def _empty_metrics() -> dict:
    return {
        "repetition_rate": 0.0,
        "lexical_density": 0.0,
        "named_entity_count": 0,
        "avg_sentence_length": 0.0,
        "pronoun_noun_ratio": 0.0,
        "negation_count": 0,
        "sentence_count": 0,
        "word_diversity": 0.0,
        "incomplete_sentence_rate": 0.0,
    }
