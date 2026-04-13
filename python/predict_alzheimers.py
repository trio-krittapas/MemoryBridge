"""
Alzheimer's Risk Prediction — Inference Module

Loaded once at sidecar startup, called by the /predict endpoint in main.py.
"""

import os
import joblib
import numpy as np
from typing import Optional

MODEL_PATH    = os.path.join(os.path.dirname(__file__), "models", "alzheimers_xgb.pkl")
FEATURES_PATH = os.path.join(os.path.dirname(__file__), "models", "alzheimers_features.pkl")

# ── Load model once at import time ─────────────────────────────────────────
_model    = None
_features = None

def _load():
    global _model, _features
    if _model is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Model not found at {MODEL_PATH}. "
                "Please run `python train_alzheimers.py` first."
            )
        _model    = joblib.load(MODEL_PATH)
        _features = joblib.load(FEATURES_PATH)

# ── Risk label helper ──────────────────────────────────────────────────────
def _risk_label(prob: float) -> str:
    if prob >= 0.65:
        return "HIGH"
    elif prob >= 0.35:
        return "MODERATE"
    return "LOW"

def _risk_description(prob: float) -> str:
    if prob >= 0.65:
        return "Significant indicators of Alzheimer's risk detected. Recommend clinical consultation."
    elif prob >= 0.35:
        return "Some indicators present. Monitor closely and consider follow-up assessment."
    return "Profile indicates lower risk. Continue regular monitoring."

# ── Public predict function ────────────────────────────────────────────────
def predict(features: dict) -> dict:
    """
    Accept a dict of feature values keyed by column name.
    Returns: { risk_score, risk_label, risk_description, top_risk_factors }
    """
    _load()

    # Build feature vector in correct order, default missing to 0
    vector = np.array([[features.get(col, 0) for col in _features]], dtype=float)

    prob  = float(_model.predict_proba(vector)[0][1])
    label = _risk_label(prob)
    desc  = _risk_description(prob)

    # Top contributing features (SHAP-lite: use feature importance * value deviation)
    importances  = _model.feature_importances_
    feature_vals = vector[0]
    contributions = importances * np.abs(feature_vals)
    top_indices  = np.argsort(contributions)[::-1][:5]
    top_factors  = [_features[i] for i in top_indices]

    return {
        "risk_score":       round(prob * 100, 1),   # 0–100
        "risk_label":       label,                   # LOW / MODERATE / HIGH
        "risk_description": desc,
        "top_risk_factors": top_factors,             # top 5 contributing features
    }


def model_ready() -> bool:
    """Returns True if the model file exists and can be loaded."""
    try:
        _load()
        return True
    except FileNotFoundError:
        return False
