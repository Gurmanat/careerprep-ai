// frontend/src/pages/InterviewCoach.jsx
import { useState } from "react";
import axios from "axios";
import CameraAnalysis from "../components/CameraAnalysis"; // ◀ PHASE 4
import VoiceAnalysis from "../components/VoiceAnalysis";


const API_BASE = "http://localhost:8000";

const QUESTION_TYPES = [
  { id: "technical",   label: "Technical",   icon: "💻", desc: "Coding, ML, tools"   },
  { id: "behavioral",  label: "Behavioral",  icon: "🧠", desc: "Teamwork, conflicts" },
  { id: "situational", label: "Situational", icon: "🎯", desc: "Problem scenarios"   },
];

const DIFFICULTY_BADGE = {
  easy:   "bg-emerald-100 text-emerald-700 border border-emerald-200",
  medium: "bg-amber-100  text-amber-700  border border-amber-200",
  hard:   "bg-rose-100   text-rose-700   border border-rose-200",
};

const TYPE_BADGE = {
  technical:   "bg-blue-100   text-blue-700   border border-blue-200",
  behavioral:  "bg-violet-100 text-violet-700 border border-violet-200",
  situational: "bg-teal-100   text-teal-700   border border-teal-200",
};

const scoreColor    = (s) => s >= 8 ? "text-emerald-500" : s >= 6 ? "text-amber-500" : "text-rose-500";
const scoreBarColor = (s) => s >= 8 ? "bg-emerald-500"   : s >= 6 ? "bg-amber-500"   : "bg-rose-500";
const gradeColor    = (s) =>
  s >= 8 ? "bg-emerald-100 text-emerald-700"
         : s >= 6 ? "bg-amber-100 text-amber-700"
         : "bg-rose-100 text-rose-600";

const JOB_SUGGESTIONS = [
  "Data Scientist", "Machine Learning Engineer", "AI Engineer",
  "Data Analyst", "MLOps Engineer", "Research Scientist",
  "Software Engineer", "Backend Developer", "Frontend Developer",
  "Full Stack Developer", "DevOps Engineer", "Product Manager",
];

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

export default function InterviewCoach() {
  const [phase, setPhase] = useState("setup"); // setup | interview | summary

  // ── Setup ──────────────────────────────────────────────────────
  const [jobRole,          setJobRole]          = useState("");
  const [selectedTypes,    setSelectedTypes]    = useState(["technical", "behavioral", "situational"]);
  const [numQuestions,     setNumQuestions]     = useState(5);
  const [useResume,        setUseResume]        = useState(false);
  const [showSuggestions,  setShowSuggestions]  = useState(false);

  // ── Interview ──────────────────────────────────────────────────
  const [questions,    setQuestions]    = useState([]);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [answers,      setAnswers]      = useState({});
  const [feedbacks,    setFeedbacks]    = useState({});
  const [showHint,     setShowHint]     = useState({});
  const [showSample,   setShowSample]   = useState({});

  // ── Loading ────────────────────────────────────────────────────
  const [generatingQ,  setGeneratingQ]  = useState(false);
  const [evaluatingId, setEvaluatingId] = useState(null);

  // ── Camera (Phase 4) ───────────────────────────────────────────  // ◀ PHASE 4
  const [showCamera,    setShowCamera]    = useState(false);          // ◀ PHASE 4
  const [cameraMetrics, setCameraMetrics] = useState({               // ◀ PHASE 4
    eyeContact: 0, posture: 0, centering: 0,                         // ◀ PHASE 4
  });  
const [showVoice, setShowVoice] = useState(false);
const [sessionVoiceMetrics, setSessionVoiceMetrics] = useState([]);

// Handler — accumulates a reading per question answered
const handleVoiceMetrics = (metrics) => {
  setSessionVoiceMetrics((prev) => [...prev, metrics]);
};                                                         // ◀ PHASE 4

  // ── Helpers ────────────────────────────────────────────────────
  const getResumeData = () => {
    try {
      const saved = localStorage.getItem("careerprep_resume");
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  };

  const toggleType = (type) =>
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const avgScore = () => {
    const scores = Object.values(feedbacks).map((f) => f.score);
    if (!scores.length) return null;
    return +(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
  };

  const filtered = JOB_SUGGESTIONS.filter((r) =>
    r.toLowerCase().includes(jobRole.toLowerCase()) && jobRole.length > 0
  );

  // ── Actions ────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!jobRole.trim() || !selectedTypes.length) return;
    setGeneratingQ(true);
    try {
      const { data } = await axios.post(`${API_BASE}/interview/generate-questions`, {
        job_role:       jobRole,
        resume_data:    useResume ? getResumeData() : null,
        question_types: selectedTypes,
        num_questions:  numQuestions,
      });
      setQuestions(data.questions);
      setAnswers({});
      setFeedbacks({});
      setCurrentIdx(0);
      setShowHint({});
      setShowSample({});
      setCameraMetrics({ eyeContact: 0, posture: 0, centering: 0 }); // ◀ PHASE 4
      setPhase("interview");
    } catch (err) {
      alert("Could not generate questions. Is your backend running?");
      console.error(err);
    } finally {
      setGeneratingQ(false);
    }
  };

  const handleEvaluate = async (qId) => {
    const q   = questions.find((x) => x.id === qId);
    const ans = answers[qId] || "";
    if (ans.trim().split(/\s+/).length < 5) {
      alert("Please write at least a few sentences before evaluating.");
      return;
    }
    setEvaluatingId(qId);
    try {
      const { data } = await axios.post(`${API_BASE}/interview/evaluate-answer`, {
        question: q.question,
        answer:   ans,
        job_role: jobRole,
      });
      setFeedbacks((prev) => ({ ...prev, [qId]: data }));
    } catch (err) {
      alert("Evaluation failed. Please try again.");
      console.error(err);
    } finally {
      setEvaluatingId(null);
    }
  };

  const resetSession = () => {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setFeedbacks({});
    setCurrentIdx(0);
    setShowCamera(false);                                             // ◀ PHASE 4
    setCameraMetrics({ eyeContact: 0, posture: 0, centering: 0 });   // ◀ PHASE 4
    setShowVoice(false);
    setSessionVoiceMetrics([]);
  };

  // ──────────────────────────────────────────────────────────────
  // PHASE: SETUP
  // ──────────────────────────────────────────────────────────────
  if (phase === "setup") {
    const resumeFound = !!getResumeData();
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4">
        <div className="max-w-xl mx-auto">

          <div className="text-center mb-10">
            <div className="text-6xl mb-3">🎙️</div>
            <h1 className="text-3xl font-extrabold text-gray-800">AI Interview Coach</h1>
            <p className="text-gray-500 mt-2 text-sm">
              Role-specific questions + instant AI feedback on every answer
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 space-y-6">

            {/* Job Role */}
            <div className="relative">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                🎯 Target Job Role <span className="text-red-500">*</span>
              </label>
              <input value={jobRole}
                onChange={(e) => { setJobRole(e.target.value); setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="e.g. Data Scientist, ML Engineer…"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800
                           focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent" />
              {showSuggestions && filtered.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200
                                rounded-xl shadow-lg overflow-hidden">
                  {filtered.slice(0, 5).map((r) => (
                    <div key={r}
                      onMouseDown={() => { setJobRole(r); setShowSuggestions(false); }}
                      className="px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 cursor-pointer">
                      {r}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Question Types */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">📚 Question Types</label>
              <div className="grid grid-cols-3 gap-3">
                {QUESTION_TYPES.map((t) => {
                  const active = selectedTypes.includes(t.id);
                  return (
                    <button key={t.id} onClick={() => toggleType(t.id)}
                      className={`py-3 rounded-xl border-2 text-center text-xs font-semibold
                                  transition-all cursor-pointer select-none
                                  ${active
                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                    : "border-gray-200 text-gray-400 hover:border-gray-300"}`}>
                      <div className="text-xl mb-1">{t.icon}</div>
                      <div>{t.label}</div>
                      <div className={`text-[10px] mt-0.5 font-normal ${active ? "text-blue-500" : "text-gray-400"}`}>
                        {t.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
              {selectedTypes.length === 0 && (
                <p className="text-xs text-red-500 mt-1.5">Select at least one type</p>
              )}
            </div>

            {/* Question Count */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🔢 Number of Questions —{" "}
                <span className="text-blue-600 font-bold">{numQuestions}</span>
              </label>
              <input type="range" min="3" max="10" value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                className="w-full accent-blue-500" />
              <div className="flex justify-between text-[11px] text-gray-400 mt-1">
                <span>3 · Quick</span><span>6 · Standard</span><span>10 · Full</span>
              </div>
            </div>

            {/* Resume Toggle */}
            <div className={`flex items-center justify-between p-4 rounded-xl border ${
              resumeFound ? "bg-blue-50 border-blue-100" : "bg-gray-50 border-gray-100"
            }`}>
              <div>
                <p className="text-sm font-semibold text-gray-700">🗂️ Personalise with resume</p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {resumeFound
                    ? "Resume found — questions will reference your background"
                    : "No resume found — build one on the Resume Builder page first"}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 shrink-0">
                <input type="checkbox" className="sr-only peer"
                  checked={useResume} disabled={!resumeFound}
                  onChange={(e) => setUseResume(e.target.checked)} />
                <div className="w-10 h-6 bg-gray-200 rounded-full peer
                                peer-checked:bg-blue-500
                                after:content-[''] after:absolute after:top-0.5 after:left-0.5
                                after:bg-white after:rounded-full after:h-5 after:w-5
                                after:transition-all peer-checked:after:translate-x-4" />
              </label>
            </div>

            {/* Generate */}
            <button onClick={handleGenerate}
              disabled={!jobRole.trim() || !selectedTypes.length || generatingQ}
              className={`w-full py-4 rounded-xl text-white font-bold text-sm tracking-wide
                          transition-all flex items-center justify-center gap-2
                          ${!jobRole.trim() || !selectedTypes.length || generatingQ
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md hover:shadow-lg"}`}>
              {generatingQ
                ? <><Spinner /> Generating {numQuestions} questions…</>
                : `🚀 Start Practice — ${numQuestions} Questions`}
            </button>
          </div>

          <div className="flex justify-center gap-4 mt-6 flex-wrap">
            {[["🤖","AI-generated questions"],["📊","Scored feedback per answer"],["📷","Live camera coaching"]].map(([icon,text]) => (  // ◀ PHASE 4 (updated last pill)
              <span key={text}
                className="flex items-center gap-1.5 text-xs text-gray-500
                           bg-white px-3 py-1.5 rounded-full border border-gray-100 shadow-sm">
                {icon} {text}
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // PHASE: INTERVIEW
  // ──────────────────────────────────────────────────────────────
  if (phase === "interview") {
    const q         = questions[currentIdx];
    const answer    = answers[q?.id]  || "";
    const feedback  = feedbacks[q?.id];
    const isEval    = evaluatingId === q?.id;
    const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4">
        {/* Outer container widens when camera is open ◀ PHASE 4 */}
        <div
          className={`mx-auto transition-all duration-300 ${
            showCamera || showVoice ? "max-w-6xl" : "max-w-2xl"
          }`}
        >

          {/* Top bar */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-gray-400">Practising for</p>
              <p className="text-sm font-bold text-gray-700">{jobRole}</p>
            </div>

            {/* ◀ PHASE 4 — camera toggle button */}
            <button onClick={() => setShowCamera((s) => !s)}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2
                          rounded-full transition-all border ${
                showCamera
                  ? "bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100"
                  : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
              }`}>
              📷 {showCamera ? "Hide Camera" : "Camera Analysis"}
            </button>
            <button
              onClick={() => setShowVoice((v) => !v)}
              className={`flex items-center gap-2 text-xs font-semibold px-4 py-2
                          rounded-full transition-all border ${
                showVoice
                  ? "bg-green-50 border-green-200 text-green-600 hover:bg-green-100"
                  : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"
              }`}
              >
              🎤 {showVoice ? "Hide Voice" : "Voice Analysis"}
            </button>

            <div className="text-right">
              <p className="text-xs text-gray-400">
                Question <span className="text-gray-700 font-bold">{currentIdx + 1}</span>
                {" "}of{" "}
                <span className="text-gray-700 font-bold">{questions.length}</span>
              </p>
              <p className="text-[11px] text-gray-400">{Object.keys(feedbacks).length} evaluated</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 mb-5">
            <div className="bg-gradient-to-r from-blue-400 to-indigo-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }} />
          </div>

          {/* ◀ PHASE 4 — 2-column layout when camera is open */}
          <div className={showCamera || showVoice ? "flex gap-5 items-start" : ""}>

            {/* ── LEFT COLUMN: question + feedback ── */}
            <div className={showCamera || showVoice ? "flex-1 min-w-0" : ""}>
              {/* Question Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">

                <div className="px-6 pt-6 pb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_BADGE[q?.type]}`}>
                      {q?.type}
                    </span>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${DIFFICULTY_BADGE[q?.difficulty]}`}>
                      {q?.difficulty}
                    </span>
                  </div>

                  <h3 className="text-base font-semibold text-gray-800 leading-relaxed">
                    <span className="text-blue-400 mr-1">Q{currentIdx + 1}.</span>
                    {q?.question}
                  </h3>

                  <button
                    onClick={() => setShowHint((p) => ({ ...p, [q.id]: !p[q.id] }))}
                    className="mt-3 text-xs text-blue-400 hover:text-blue-600 flex items-center gap-1">
                    💡 {showHint[q?.id] ? "Hide hint" : "Show approach hint"}
                  </button>
                  {showHint[q?.id] && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-lg
                                    text-xs text-blue-700 leading-relaxed">
                      {q?.hint}
                    </div>
                  )}
                </div>

                {/* Answer textarea */}
                <div className="px-6 pb-4">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">✍️ Your Answer</label>
                  <textarea value={answer}
                    onChange={(e) => setAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                    placeholder="Be specific — use the STAR method for behavioral questions."
                    rows={6}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800
                               focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
                  <div className="flex justify-between items-center mt-1">
                    <span className={`text-xs ${wordCount < 30 ? "text-gray-400" : "text-emerald-500"}`}>
                      {wordCount} words {wordCount < 30 && wordCount > 0 && "— try to write more"}
                    </span>
                    {feedback && <span className="text-xs text-emerald-500">✓ Already evaluated</span>}
                  </div>
                </div>

                {/* Buttons */}
                <div className="px-6 pb-6 flex gap-3">
                  <button onClick={() => handleEvaluate(q.id)}
                    disabled={wordCount < 5 || isEval}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all
                                flex items-center justify-center gap-2
                                ${wordCount < 5 || isEval
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:shadow-md"}`}>
                    {isEval ? <><Spinner /> Analysing…</> : feedback ? "🔄 Re-evaluate" : "🤖 Get AI Feedback"}
                  </button>
                  <button
                    onClick={() =>
                      currentIdx < questions.length - 1
                        ? setCurrentIdx((i) => i + 1)
                        : setPhase("summary")
                    }
                    className="px-5 py-3 rounded-xl text-sm font-semibold bg-gray-100
                               text-gray-700 hover:bg-gray-200 transition-all">
                    {currentIdx === questions.length - 1 ? "📊 Results" : "Next →"}
                  </button>
                </div>
              </div>

              {/* Feedback Panel */}
              {feedback && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">

                  <div className="px-6 py-5 border-b border-gray-50 flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-xs text-gray-400 mb-1">AI Feedback</p>
                      <p className="text-sm text-gray-700 leading-relaxed">{feedback.overall_feedback}</p>
                    </div>
                    <div className="text-center shrink-0">
                      <div className={`text-4xl font-black leading-none ${scoreColor(feedback.score)}`}>
                        {feedback.score}<span className="text-sm text-gray-400">/10</span>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${gradeColor(feedback.score)}`}>
                        {feedback.grade}
                      </span>
                      <div className="w-16 bg-gray-100 rounded-full h-1.5 mt-2">
                        <div className={`h-1.5 rounded-full ${scoreBarColor(feedback.score)}`}
                          style={{ width: `${feedback.score * 10}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">✅ Strengths</h4>
                        <ul className="space-y-1.5">
                          {feedback.strengths?.map((s, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                              <span className="text-emerald-400 shrink-0">▸</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-amber-600 mb-2 uppercase tracking-wide">⚡ Improve</h4>
                        <ul className="space-y-1.5">
                          {feedback.improvements?.map((s, i) => (
                            <li key={i} className="text-xs text-gray-600 flex gap-1.5">
                              <span className="text-amber-400 shrink-0">▸</span>{s}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {(feedback.keywords_used?.length > 0 || feedback.keywords_missing?.length > 0) && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">🔑 Keywords</h4>
                        <div className="flex flex-wrap gap-1.5">
                          {feedback.keywords_used?.map((kw, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700
                                                     rounded-full border border-emerald-200">✓ {kw}</span>
                          ))}
                          {feedback.keywords_missing?.map((kw, i) => (
                            <span key={i} className="text-[11px] px-2 py-0.5 bg-rose-50 text-rose-600
                                                     rounded-full border border-rose-200">✗ {kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <button
                        onClick={() => setShowSample((p) => ({ ...p, [q.id]: !p[q.id] }))}
                        className="text-xs font-semibold text-indigo-500 hover:text-indigo-700 flex items-center gap-1">
                        {showSample[q?.id] ? "▲ Hide" : "▼ Show"} sample answer
                      </button>
                      {showSample[q?.id] && (
                        <div className="mt-2 p-4 bg-indigo-50 border border-indigo-100 rounded-xl
                                        text-xs text-gray-700 leading-relaxed">
                          {feedback.sample_answer}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Dots */}
              <div className="flex justify-center items-center gap-2 mt-2">
                {questions.map((qItem, i) => (
                  <button key={qItem.id} onClick={() => setCurrentIdx(i)} title={`Q${i + 1}`}
                    className={`rounded-full transition-all duration-200 ${
                      i === currentIdx
                        ? "w-4 h-4 bg-blue-500 scale-110"
                        : feedbacks[qItem.id]
                        ? "w-2.5 h-2.5 bg-emerald-400"
                        : answers[qItem.id]?.trim()
                        ? "w-2.5 h-2.5 bg-amber-400"
                        : "w-2.5 h-2.5 bg-gray-300"
                    }`} />
                ))}
              </div>
              <p className="text-center text-[10px] text-gray-400 mt-1.5">
                🟡 Answered · 🟢 Evaluated · ⚫ Not started
              </p>
            </div>
            {/* ── end LEFT COLUMN ── */}

            {/* ── RIGHT COLUMN: camera (Phase 4) ── */}  {/* ◀ PHASE 4 */}
            <div className="w-72 shrink-0 sticky top-6 space-y-3">

            {showCamera && (
             <CameraAnalysis
                isActive={showCamera && phase === "interview"}
                onMetricsUpdate={(m) => setCameraMetrics(m)}
              />
            )}

  {showVoice && (
    <VoiceAnalysis
      onMetricsUpdate={handleVoiceMetrics}
    />
  )}

</div>

          </div>
          {/* ── end 2-column wrapper ── */}

        </div>
      </div>
    );
  }

  // ──────────────────────────────────────────────────────────────
  // PHASE: SUMMARY
  // ──────────────────────────────────────────────────────────────
  const avg           = avgScore();
  const evalCount     = Object.keys(feedbacks).length;
  const answeredCount = Object.values(answers).filter((a) => a.trim()).length;
  const summaryEmoji  = avg === null ? "📋" : avg >= 8 ? "🏆" : avg >= 6 ? "🌟" : avg >= 4 ? "💪" : "📚";
  const hasCameraData = cameraMetrics.eyeContact > 0 || cameraMetrics.posture > 0; // ◀ PHASE 4

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-xl mx-auto">

        <div className="text-center mb-8">
          <div className="text-6xl mb-3">{summaryEmoji}</div>
          <h1 className="text-2xl font-extrabold text-gray-800">Session Complete!</h1>
          <p className="text-sm text-gray-500 mt-1">
            {answeredCount} answered · {evalCount} evaluated · {questions.length} total
          </p>
        </div>

        {/* Score Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7 text-center mb-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-1">Average Score</p>
          {avg !== null ? (
            <>
              <div className={`text-6xl font-black ${scoreColor(avg)}`}>{avg}</div>
              <p className="text-sm text-gray-400 mb-4">out of 10</p>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full transition-all duration-1000 ${scoreBarColor(avg)}`}
                  style={{ width: `${(avg / 10) * 100}%` }} />
              </div>
              <p className="text-xs text-gray-400 mt-2">
                {avg >= 8 ? "Excellent — you're interview-ready! 🚀"
                  : avg >= 6 ? "Good effort — keep practising structured answers"
                  : "Room to grow — review sample answers and try again"}
              </p>
            </>
          ) : (
            <p className="text-gray-400 text-sm">Evaluate your answers to see a score</p>
          )}
        </div>

        {/* ◀ PHASE 4 — Camera Performance Card */}
        {hasCameraData && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-gray-700">📸 Camera Performance</h3>
              <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                Session average
              </span>
            </div>
            <p className="text-xs text-gray-400 mb-4">
              Based on live analysis during your interview session
            </p>
            {[
              { label: "Eye Contact",     value: cameraMetrics.eyeContact, icon: "👁️", bar: "bg-blue-500"   },
              { label: "Head Posture",    value: cameraMetrics.posture,    icon: "🧍", bar: "bg-violet-500" },
              { label: "Frame Centering", value: cameraMetrics.centering,  icon: "🎯", bar: "bg-teal-500"   },
            ].map(({ label, value, icon, bar }) => (
              <div key={label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-gray-600">{icon} {label}</span>
                  <span className={`font-bold ${
                    value >= 70 ? "text-emerald-600" : value >= 50 ? "text-amber-600" : "text-rose-500"
                  }`}>{value}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full ${bar}`} style={{ width: `${value}%` }} />
                </div>
              </div>
            ))}
            {/* Combined presence tip */}
            <div className="mt-3 pt-3 border-t border-gray-50">
              {cameraMetrics.eyeContact < 50 && (
                <p className="text-xs text-amber-600">💡 Focus on maintaining eye contact with the camera lens</p>
              )}
              {cameraMetrics.eyeContact >= 70 && cameraMetrics.posture >= 70 && (
                <p className="text-xs text-emerald-600">✅ Strong on-camera presence — great for video interviews!</p>
              )}
            </div>
          </div>
        )}
        
        {sessionVoiceMetrics.length > 0 && (() => {
          const avg = (key) => Math.round(
            sessionVoiceMetrics.reduce((s, m) => s + (m[key] ?? 0), 0) / sessionVoiceMetrics.length
          );
          return (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
              <h3 className="font-semibold text-white mb-4">🎤 Voice Performance</h3>
              {[
                { label: "Overall Voice",   val: avg("overall") },
                { label: "Filler Words",    val: avg("fillers")  },
                { label: "Speaking Pace",   val: avg("pace")     },
                { label: "Vocal Tone",      val: avg("tone")     },
                { label: "Energy & Volume", val: avg("energy")   },
              ].map(({ label, val }) => (
                <div key={label} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-300">{label}</span>
                    <span className="font-bold text-indigo-400">{val}/100</span>
                  </div>
                  <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700
                        ${val >= 80 ? "bg-green-500" : val >= 55 ? "bg-yellow-500" : "bg-red-500"}`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-slate-400 mt-3">
                Avg {avg("wpm")} WPM · {Math.round(
                  sessionVoiceMetrics.reduce((s, m) => s + (m.fillerCount ?? 0), 0) / sessionVoiceMetrics.length
                )} fillers/answer
              </p>
            </div>
          );
        })()}

        {/* Question Breakdown */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
          <h3 className="text-sm font-bold text-gray-700 mb-4">Question Breakdown</h3>
          <div className="space-y-2.5">
            {questions.map((qItem, i) => {
              const fb  = feedbacks[qItem.id];
              const ans = answers[qItem.id];
              return (
                <div key={qItem.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="text-xs font-bold text-gray-400 w-5 shrink-0">Q{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{qItem.question}</p>
                    <div className="flex gap-1.5 mt-0.5">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${TYPE_BADGE[qItem.type]}`}>
                        {qItem.type}
                      </span>
                      {!ans?.trim()  && <span className="text-[10px] text-gray-400">not answered</span>}
                      {ans?.trim() && !fb && <span className="text-[10px] text-amber-500">not evaluated</span>}
                    </div>
                  </div>
                  {fb ? (
                    <span className={`text-sm font-black shrink-0 ${scoreColor(fb.score)}`}>
                      {fb.score}/10
                    </span>
                  ) : (
                    <button onClick={() => { setCurrentIdx(i); setPhase("interview"); }}
                      className="text-[11px] text-blue-400 hover:underline shrink-0">
                      {ans?.trim() ? "Evaluate" : "Answer"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => { setPhase("interview"); setCurrentIdx(0); }}
            className="flex-1 py-3 rounded-xl text-sm font-semibold bg-white border
                       border-gray-200 text-gray-700 hover:bg-gray-50 transition-all">
            ← Review Answers
          </button>
          <button onClick={resetSession}
            className="flex-1 py-3 rounded-xl text-sm font-semibold text-white
                       bg-gradient-to-r from-blue-500 to-indigo-600 hover:shadow-md transition-all">
            🔄 New Session
          </button>
        </div>
      </div>
    </div>
  );
}