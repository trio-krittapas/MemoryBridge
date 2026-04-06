import whisper
import os

# Load model once at startup
model = whisper.load_model("base") # "base" is good for speed/accuracy balance in English

def transcribe_audio(file_path: str):
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    result = model.transcribe(file_path, task="transcribe")
    
    # Return structured data
    return {
        "text": result["text"],
        "segments": result["segments"]
    }
