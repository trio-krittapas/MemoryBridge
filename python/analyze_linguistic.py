import spacy
import nltk
from nltk.tokenize import sent_tokenize

# Load spaCy English model
try:
    nlp = spacy.load("en_core_web_sm")
except ImportError:
    import os
    os.system("python -m spacy download en_core_web_sm")
    nlp = spacy.load("en_core_web_sm")

def analyze_linguistic(text: str, segments: list):
    # 1. Basic counts
    doc = nlp(text)
    words = [token.text for token in doc if not token.is_punct]
    word_count = len(words)
    
    # 2. Type-Token Ratio (Vocabulary diversity)
    unique_words = set([w.lower() for w in words])
    ttr = len(unique_words) / word_count if word_count > 0 else 0
    
    # 3. Mean Length of Utterance (MLU) - approximated by segments
    mlu = word_count / len(segments) if segments else 0
    
    # 4. Filler words (basic detection)
    fillers = ["um", "uh", "err", "ah", "like"]
    filler_count = sum(1 for w in words if w.lower() in fillers)
    
    # 5. Speech Rate (approximate)
    total_duration = segments[-1]["end"] if segments else 0
    speech_rate = (word_count / (total_duration / 60)) if total_duration > 0 else 0
    
    # 6. Pause Detection (gap between segments)
    pause_count = 0
    total_pause_duration = 0
    for i in range(len(segments) - 1):
        gap = segments[i+1]["start"] - segments[i]["end"]
        if gap > 0.5: # 0.5s or longer is a significant pause
            pause_count += 1
            total_pause_duration += gap
            
    avg_pause_duration = total_pause_duration / pause_count if pause_count > 0 else 0
    
    return {
        "word_count": word_count,
        "type_token_ratio": ttr,
        "mean_length_utterance": mlu,
        "filler_word_count": filler_count,
        "speech_rate": speech_rate,
        "pause_count": pause_count,
        "avg_pause_duration": avg_pause_duration
    }
