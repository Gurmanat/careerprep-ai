# backend/services/rag_service.py

import os
import re
import json
import faiss
import numpy as np
from sentence_transformers import SentenceTransformer
from langchain.text_splitter import RecursiveCharacterTextSplitter

# ── Load embedding model once at startup (cached) ──────────────────────────
# all-MiniLM-L6-v2 is small (80 MB), fast, and great for resume text
_embedder = SentenceTransformer("all-MiniLM-L6-v2")

# ── In-memory store: one index per session_id ───────────────────────────────
# Structure: { session_id: { "index": faiss.Index, "chunks": [str], "metadata": [dict] } }
_stores: dict[str, dict] = {}

EMBED_DIM = 384  # all-MiniLM-L6-v2 output dimension


# ── 1. Text cleaning ─────────────────────────────────────────────────────────
def _clean_text(text: str) -> str:
    text = re.sub(r'\s+', ' ', text)          # collapse whitespace
    text = re.sub(r'[^\x00-\x7F]+', ' ', text)  # remove non-ASCII
    return text.strip()


# ── 2. Chunk the resume text ─────────────────────────────────────────────────
def _chunk_resume(text: str) -> list[str]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=400,
        chunk_overlap=80,
        separators=["\n\n", "\n", ".", ",", " "]
    )
    raw_chunks = splitter.split_text(text)
    # Filter out very short / noisy chunks
    return [c.strip() for c in raw_chunks if len(c.strip()) > 40]


# ── 3. Build FAISS index for a session ──────────────────────────────────────
def build_index(session_id: str, resume_text: str) -> int:
    """
    Embeds resume chunks and stores a FAISS index in memory.
    Returns the number of chunks indexed.
    """
    cleaned = _clean_text(resume_text)
    chunks  = _chunk_resume(cleaned)

    if not chunks:
        raise ValueError("Resume text too short to index — paste more content.")

    embeddings = _embedder.encode(chunks, show_progress_bar=False, normalize_embeddings=True)
    embeddings = np.array(embeddings, dtype="float32")

    # IndexFlatIP = inner product on normalised vectors = cosine similarity
    index = faiss.IndexFlatIP(EMBED_DIM)
    index.add(embeddings)

    _stores[session_id] = {
        "index":  index,
        "chunks": chunks,
        "meta":   [{"chunk_id": i, "preview": c[:80]} for i, c in enumerate(chunks)]
    }

    return len(chunks)


# ── 4. Retrieve top-k relevant chunks ────────────────────────────────────────
def retrieve(session_id: str, query: str, top_k: int = 4) -> list[str]:
    """
    Returns the top_k resume chunks most relevant to the query.
    Falls back to [] if no index exists for the session.
    """
    store = _stores.get(session_id)
    if not store:
        return []

    q_embed = _embedder.encode([query], normalize_embeddings=True)
    q_embed = np.array(q_embed, dtype="float32")

    scores, indices = store["index"].search(q_embed, min(top_k, store["index"].ntotal))
    results = [store["chunks"][i] for i in indices[0] if i >= 0]
    return results


# ── 5. Check if index exists ─────────────────────────────────────────────────
def has_index(session_id: str) -> bool:
    return session_id in _stores


# ── 6. Delete index (cleanup) ────────────────────────────────────────────────
def delete_index(session_id: str):
    _stores.pop(session_id, None)


# ── 7. Get index stats ────────────────────────────────────────────────────────
def index_stats(session_id: str) -> dict:
    store = _stores.get(session_id)
    if not store:
        return {"indexed": False}
    return {
        "indexed":      True,
        "chunk_count":  store["index"].ntotal,
        "previews":     [m["preview"] for m in store["meta"][:5]]
    }