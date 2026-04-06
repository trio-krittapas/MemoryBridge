from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import shutil
import os
import tempfile
from transcribe import transcribe_audio
from analyze_linguistic import analyze_linguistic
from analyze_acoustic import analyze_acoustic

app = FastAPI(title="MemoryBridge Speech Analysis Sidecar")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/analyze")
async def analyze_speech(file: UploadFile = File(...)):
    # 1. Save uploaded file to temp
    temp_dir = tempfile.mkdtemp()
    file_path = os.path.join(temp_dir, file.filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. Transcribe
        transcription_result = transcribe_audio(file_path)
        text = transcription_result["text"]
        segments = transcription_result["segments"]
        
        # 3. Linguistic Analysis
        linguistic_metrics = analyze_linguistic(text, segments)
        
        # 4. Acoustic Analysis
        acoustic_metrics = analyze_acoustic(file_path)
        
        return {
            "transcript": text,
            "linguistic": linguistic_metrics,
            "acoustic": acoustic_metrics,
            "status": "success"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        # Clean up temp files
        if os.path.exists(file_path):
            os.remove(file_path)
        os.rmdir(temp_dir)

@app.get("/health")
def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
