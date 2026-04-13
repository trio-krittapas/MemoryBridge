"""
Alzheimer's Risk Prediction Model Training Script
Dataset: https://www.kaggle.com/datasets/rabieelkharoua/alzheimers-disease-dataset

Usage:
    python train_alzheimers.py

Prerequisites:
    pip install pandas scikit-learn xgboost joblib matplotlib seaborn

Place the downloaded CSV at: python/data/alzheimers.csv
"""

import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import (
    classification_report, confusion_matrix, roc_auc_score, ConfusionMatrixDisplay
)
from xgboost import XGBClassifier
import matplotlib.pyplot as plt
import seaborn as sns

# ── Paths ────────────────────────────────────────────────────────────────────
DATA_PATH  = os.path.join(os.path.dirname(__file__), "data", "alzheimers.csv")
MODEL_DIR  = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "alzheimers_xgb.pkl")
FEATURES_PATH = os.path.join(MODEL_DIR, "alzheimers_features.pkl")

os.makedirs(MODEL_DIR, exist_ok=True)

# ── Feature columns used for training ─────────────────────────────────────
# These must exactly match the keys sent from the Next.js API
FEATURE_COLUMNS = [
    "Age",
    "Gender",
    "Ethnicity",
    "EducationLevel",
    "BMI",
    "Smoking",
    "AlcoholConsumption",
    "PhysicalActivity",
    "DietQuality",
    "SleepQuality",
    "FamilyHistoryAlzheimers",
    "CardiovascularDisease",
    "Diabetes",
    "Depression",
    "HeadInjury",
    "Hypertension",
    "SystolicBP",
    "DiastolicBP",
    "CholesterolTotal",
    "CholesterolLDL",
    "CholesterolHDL",
    "CholesterolTriglycerides",
    "MMSE",
    "FunctionalAssessment",
    "MemoryComplaints",
    "BehavioralProblems",
    "ADL",
    "Confusion",
    "Disorientation",
    "PersonalityChanges",
    "DifficultyCompletingTasks",
    "Forgetfulness",
]

TARGET_COLUMN = "Diagnosis"

# ── Step 1: Load Data ─────────────────────────────────────────────────────
print("=" * 60)
print("Step 1: Loading data...")
print("=" * 60)

if not os.path.exists(DATA_PATH):
    raise FileNotFoundError(
        f"\nDataset not found at: {DATA_PATH}\n"
        "Please download it from:\n"
        "  https://www.kaggle.com/datasets/rabieelkharoua/alzheimers-disease-dataset\n"
        "and place the CSV at python/data/alzheimers.csv"
    )

df = pd.read_csv(DATA_PATH)
print(f"Loaded {len(df)} rows, {len(df.columns)} columns")
print(f"Columns: {list(df.columns)}")
print(f"\nTarget distribution:\n{df[TARGET_COLUMN].value_counts()}")
print(f"\nClass balance: {df[TARGET_COLUMN].mean():.1%} positive (Alzheimer's)")

# ── Step 2: Prepare Features ──────────────────────────────────────────────
print("\n" + "=" * 60)
print("Step 2: Preparing features...")
print("=" * 60)

# Drop columns not used for prediction
drop_cols = [c for c in df.columns if c not in FEATURE_COLUMNS + [TARGET_COLUMN]]
if drop_cols:
    print(f"Dropping columns: {drop_cols}")
    df = df.drop(columns=drop_cols)

# Verify all expected feature columns are present
missing = [c for c in FEATURE_COLUMNS if c not in df.columns]
if missing:
    raise ValueError(f"Missing expected columns: {missing}")

X = df[FEATURE_COLUMNS]
y = df[TARGET_COLUMN]

print(f"Feature matrix shape: {X.shape}")
print(f"\nMissing values per column:\n{X.isnull().sum()[X.isnull().sum() > 0]}")

# Fill any missing values with median (safe fallback)
X = X.fillna(X.median(numeric_only=True))

# ── Step 3: Train / Test Split ────────────────────────────────────────────
print("\n" + "=" * 60)
print("Step 3: Splitting data (80/20)...")
print("=" * 60)

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)
print(f"Train: {len(X_train)} samples | Test: {len(X_test)} samples")

# ── Step 4: Train XGBoost ─────────────────────────────────────────────────
print("\n" + "=" * 60)
print("Step 4: Training XGBoost classifier...")
print("=" * 60)

model = XGBClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.05,
    subsample=0.8,
    colsample_bytree=0.8,
    use_label_encoder=False,
    eval_metric="logloss",
    random_state=42,
    n_jobs=-1,
)

model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50,
)

# ── Step 5: Evaluate ──────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("Step 5: Evaluation")
print("=" * 60)

y_pred  = model.predict(X_test)
y_proba = model.predict_proba(X_test)[:, 1]
auc     = roc_auc_score(y_test, y_proba)

print(f"\nROC-AUC Score: {auc:.4f}")
print(f"\nClassification Report:\n{classification_report(y_test, y_pred, target_names=['No Alzheimers', 'Alzheimers'])}")

# Confusion matrix plot
cm = confusion_matrix(y_test, y_pred)
fig, axes = plt.subplots(1, 2, figsize=(14, 5))

ConfusionMatrixDisplay(cm, display_labels=["No Alzheimer's", "Alzheimer's"]).plot(ax=axes[0])
axes[0].set_title("Confusion Matrix")

# Feature importance plot
fi = pd.Series(model.feature_importances_, index=FEATURE_COLUMNS).sort_values(ascending=True).tail(15)
fi.plot(kind="barh", ax=axes[1], color="steelblue")
axes[1].set_title("Top 15 Feature Importances")
axes[1].set_xlabel("Importance Score")

plt.tight_layout()
plot_path = os.path.join(MODEL_DIR, "training_results.png")
plt.savefig(plot_path, dpi=120)
print(f"\nPlots saved to: {plot_path}")

# ── Step 6: Save Model ────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("Step 6: Saving model...")
print("=" * 60)

joblib.dump(model, MODEL_PATH)
joblib.dump(FEATURE_COLUMNS, FEATURES_PATH)

print(f"Model saved to:    {MODEL_PATH}")
print(f"Features saved to: {FEATURES_PATH}")
print(f"\nDone! AUC = {auc:.4f}")
print("\nNext step: run `python main.py` to start the sidecar with the /predict endpoint.")
