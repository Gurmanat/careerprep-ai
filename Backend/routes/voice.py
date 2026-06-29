# backend/routes/voice.py

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException
from services.voice_service import analyze_voice

router = APIRouter(prefix="/voice", tags=["voice"])

ALLOWED_TYPES = {
    "audio/webm", "audio/wav", "audio/mp4",
    "audio/mpeg", "audio/ogg", "audio/x-m4a", "audio/mp3"
}

@router.post("/analyze")
async def analyze_voice_answer(audio: UploadFile = File(...)):
    # Determine file extension (browsers often send audio/webm)
    ext = ".webm"
    if audio.filename:
        _, file_ext = os.path.splitext(audio.filename)
        if file_ext:
            ext = file_ext

    # Save to a temp file so librosa and whisper can read it
    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        content = await audio.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        result = analyze_voice(tmp_path)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Voice analysis failed: {str(e)}")
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)