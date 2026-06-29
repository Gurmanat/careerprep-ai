# backend/routes/rag.py

import io
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from PyPDF2 import PdfReader
from services.rag_service import build_index, index_stats, delete_index, has_index

router = APIRouter(prefix="/rag", tags=["rag"])


# ── Helper: extract text from PDF bytes ─────────────────────────────────────
def _extract_pdf_text(data: bytes) -> str:
    reader = PdfReader(io.BytesIO(data))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


# ── POST /rag/index-text  (plain text / JSON paste) ─────────────────────────
class IndexTextRequest(BaseModel):
    session_id: str
    resume_text: str

@router.post("/index-text")
async def index_text(req: IndexTextRequest):
    if len(req.resume_text.strip()) < 100:
        raise HTTPException(400, "Resume text is too short (minimum ~100 characters).")
    try:
        count = build_index(req.session_id, req.resume_text)
        return {"session_id": req.session_id, "chunks_indexed": count, "status": "ready"}
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── POST /rag/index-pdf  (file upload) ───────────────────────────────────────
@router.post("/index-pdf")
async def index_pdf(
    session_id: str = Form(...),
    file: UploadFile = File(...)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files are supported.")
    data = await file.read()
    text = _extract_pdf_text(data)
    if len(text.strip()) < 100:
        raise HTTPException(400, "Could not extract enough text from PDF. Try pasting your resume instead.")
    try:
        count = build_index(session_id, text)
        return {"session_id": session_id, "chunks_indexed": count, "status": "ready"}
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── GET /rag/status/{session_id} ─────────────────────────────────────────────
@router.get("/status/{session_id}")
async def rag_status(session_id: str):
    return index_stats(session_id)


# ── DELETE /rag/index/{session_id} ───────────────────────────────────────────
@router.delete("/index/{session_id}")
async def remove_index(session_id: str):
    delete_index(session_id)
    return {"deleted": True}


# ── POST /rag/new-session  (generate a fresh session ID) ────────────────────
@router.post("/new-session")
async def new_session():
    return {"session_id": str(uuid.uuid4())}