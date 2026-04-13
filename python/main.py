from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import shutil
import os
import tempfile
from transcribe import transcribe_audio
from analyze_linguistic import analyze_linguistic
from analyze_acoustic import analyze_acoustic
from analyze_transcript_nlp import analyze_transcript_nlp
from predict_alzheimers import predict as predict_alzheimers_risk, model_ready as alzheimers_model_ready
from predict_speech_cognition import classify_transcript

app = FastAPI(title="MemoryBridge Speech Analysis Sidecar")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Speech Analysis (updated: now includes NLP + cognition) ──────────────
@app.post("/analyze")
async def analyze_speech(file: UploadFile = File(...)):
    temp_dir  = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)

    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 1. Transcribe
        transcription_result = transcribe_audio(file_path)
        text     = transcription_result["text"]
        segments = transcription_result["segments"]

        # 2. Linguistic Analysis (existing)
        linguistic_metrics = analyze_linguistic(text, segments)

        # 3. Acoustic Analysis (existing)
        acoustic_metrics = analyze_acoustic(file_path)

        # 4. Deep NLP Analysis (NEW)
        nlp_metrics = analyze_transcript_nlp(text, segments)

        # 5. Speech Cognition Classification (NEW)
        cognition = classify_transcript(text, segments)

        return {
            "transcript":  text,
            "linguistic":  linguistic_metrics,
            "acoustic":    acoustic_metrics,
            "nlp":         nlp_metrics,
            "cognition":   cognition,
            "status":      "success",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


# ── Standalone Transcript Cognition Endpoint ─────────────────────────────
class TranscriptRequest(BaseModel):
    transcript: str
    segments:   Optional[List[dict]] = []


@app.post("/analyze-cognition")
async def analyze_cognition(req: TranscriptRequest):
    """
    Accepts a transcript (already transcribed) and returns deep NLP
    metrics + zero-shot cognitive marker classification.
    Useful for re-analyzing stored transcripts without re-uploading audio.
    """
    try:
        nlp_metrics = analyze_transcript_nlp(req.transcript, req.segments)
        cognition   = classify_transcript(req.transcript, req.segments)
        return {
            "nlp":       nlp_metrics,
            "cognition": cognition,
            "status":    "success",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Alzheimer's Risk Prediction ──────────────────────────────────────────
class HealthData(BaseModel):
    Age: float
    Gender: int
    Ethnicity: int
    EducationLevel: int
    BMI: float
    Smoking: int
    AlcoholConsumption: float
    PhysicalActivity: float
    DietQuality: float
    SleepQuality: float
    FamilyHistoryAlzheimers: int
    CardiovascularDisease: int
    Diabetes: int
    Depression: int
    HeadInjury: int
    Hypertension: int
    SystolicBP: float
    DiastolicBP: float
    CholesterolTotal: float
    CholesterolLDL: float
    CholesterolHDL: float
    CholesterolTriglycerides: float
    MMSE: float
    FunctionalAssessment: float
    MemoryComplaints: int
    BehavioralProblems: int
    ADL: float
    Confusion: int
    Disorientation: int
    PersonalityChanges: int
    DifficultyCompletingTasks: int
    Forgetfulness: int


@app.post("/predict")
async def predict_risk(data: HealthData):
    if not alzheimers_model_ready():
        raise HTTPException(
            status_code=503,
            detail="Model not trained yet. Run `python train_alzheimers.py` first.",
        )
    try:
        result = predict_alzheimers_risk(data.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Health Check ─────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    return {
        "status":               "healthy",
        "model_ready":          alzheimers_model_ready(),
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
