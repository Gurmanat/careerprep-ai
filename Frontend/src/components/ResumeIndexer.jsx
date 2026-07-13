// frontend/src/components/ResumeIndexer.jsx
import { useState } from "react";
import axios from "axios";

const API = "http://localhost:8000";

export default function ResumeIndexer({ sessionId, onIndexed, isIndexed }) {
  const [mode, setMode]         = useState("paste");   // "paste" | "upload"
  const [text, setText]         = useState("");
  const [file, setFile]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [stats, setStats]       = useState(null);

  const handleIndex = async () => {
    setError("");
    setLoading(true);
    try {
      let res;
      if (mode === "paste") {
        res = await axios.post(`${API}/rag/index-text`, {
          session_id:  sessionId,
          resume_text: text,
        });
      } else {
        const form = new FormData();
        form.append("session_id", sessionId);
        form.append("file", file);
        res = await axios.post(`${API}/rag/index-pdf`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      setStats(res.data);
      onIndexed(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Indexing failed — check backend.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    await axios.delete(`${API}/rag/index/${sessionId}`).catch(() => {});
    setStats(null);
    setText("");
    setFile(null);
    onIndexed(false);
  };

  // ── Already indexed ──────────────────────────────────────────────────────
  if (isIndexed && stats) {
    return (
      <div className="bg-indigo-900/30 border border-indigo-600 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧠</span>
            <span className="font-semibold text-indigo-300 text-sm">RAG Active</span>
            <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
              ✓ {stats.chunks_indexed} chunks indexed
            </span>
          </div>
          <button
            onClick={handleClear}
            className="text-xs text-slate-400 hover:text-red-400 transition-colors"
          >
            ✕ Clear
          </button>
        </div>
        <p className="text-xs text-indigo-300/70">
          Interview questions will be personalised using your resume. The AI has read your
          projects, skills, and experience.
        </p>
      </div>
    );
  }

  // ── Setup panel ──────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🧠</span>
        <div>
          <p className="font-semibold text-white text-sm">Resume RAG</p>
          <p className="text-xs text-slate-400">
            Upload your resume so questions are tailored to your actual background
          </p>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg mb-4">
        {["paste", "upload"].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors
              ${mode === m ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            {m === "paste" ? "📋 Paste Text" : "📄 Upload PDF"}
          </button>
        ))}
      </div>

      {/* Input area */}
      {mode === "paste" ? (
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste your full resume text here — include skills, experience, projects, education…"
          rows={7}
          className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-sm text-slate-200
                     placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500
                     focus:ring-1 focus:ring-indigo-500 transition-colors"
        />
      ) : (
        <label className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg
          p-6 cursor-pointer transition-colors
          ${file ? "border-indigo-500 bg-indigo-900/20" : "border-slate-600 hover:border-slate-400"}`}>
          <input
            type="file"
            accept=".pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files[0] || null)}
          />
          {file ? (
            <>
              <span className="text-2xl mb-1">📄</span>
              <span className="text-sm text-indigo-300 font-medium">{file.name}</span>
              <span className="text-xs text-slate-400 mt-1">
                {(file.size / 1024).toFixed(0)} KB — click to change
              </span>
            </>
          ) : (
            <>
              <span className="text-2xl mb-1">⬆️</span>
              <span className="text-sm text-slate-300">Click to choose a PDF</span>
              <span className="text-xs text-slate-500 mt-1">Max ~5 MB</span>
            </>
          )}
        </label>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Index button */}
      <button
        onClick={handleIndex}
        disabled={loading || (mode === "paste" ? text.length < 100 : !file)}
        className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700
                   disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl
                   transition-colors flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Indexing with FAISS…
          </>
        ) : (
          "🧠 Index Resume"
        )}
      </button>

      <p className="text-xs text-slate-500 mt-2 text-center">
        Runs locally — your resume never leaves your machine
      </p>
    </div>
  );
}