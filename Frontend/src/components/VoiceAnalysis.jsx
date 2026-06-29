// frontend/src/components/VoiceAnalysis.jsx
import { useState, useRef, useEffect } from "react";
import axios from "axios";

const SCORE_COLOR = (s) =>
  s >= 80 ? "bg-green-500" : s >= 55 ? "bg-yellow-500" : "bg-red-500";

const MetricBar = ({ label, score, feedback }) => (
  <div className="mb-3">
    <div className="flex justify-between text-xs mb-1">
      <span className="text-slate-300 font-medium">{label}</span>
      <span className={`font-bold ${score >= 80 ? "text-green-400" : score >= 55 ? "text-yellow-400" : "text-red-400"}`}>
        {score}/100
      </span>
    </div>
    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${SCORE_COLOR(score)}`}
        style={{ width: `${score}%` }}
      />
    </div>
    <p className="text-xs text-slate-400 mt-1">{feedback}</p>
  </div>
);

// Highlight filler words in transcript
const HighlightedTranscript = ({ text, fillerCounts }) => {
  if (!text) return null;
  const fillers = Object.keys(fillerCounts);
  if (fillers.length === 0) return <p className="text-slate-300 text-sm leading-relaxed">{text}</p>;

  const pattern = new RegExp(`\\b(${fillers.map(f => f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join("|")})\\b`, "gi");
  const parts = text.split(pattern);

  return (
    <p className="text-slate-300 text-sm leading-relaxed">
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-300 rounded px-0.5 font-semibold">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
};

export default function VoiceAnalysis({ onMetricsUpdate }) {
  const [recording, setRecording] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult]       = useState(null);
  const [error, setError]         = useState("");
  const [elapsed, setElapsed]     = useState(0);
  const [audioURL, setAudioURL]   = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef        = useRef([]);
  const timerRef         = useRef(null);

  // Clean up timer on unmount
  useEffect(() => () => clearInterval(timerRef.current), []);

  const startRecording = async () => {
    setError("");
    setResult(null);
    setAudioURL(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioURL(URL.createObjectURL(blob));
        await sendForAnalysis(blob);
      };

      recorder.start(250); // collect in 250ms chunks
      mediaRecorderRef.current = recorder;

      // Start elapsed timer
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
      setRecording(true);
    } catch {
      setError("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current);
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  const sendForAnalysis = async (blob) => {
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");

      const { data } = await axios.post("http://localhost:8000/voice/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000, // Whisper + librosa can take a moment
      });

      setResult(data);
      onMetricsUpdate?.({
        overall:   data.overall_score,
        fillers:   data.filler_words.score,
        pace:      data.pace.score,
        tone:      data.tone.pitch.score,
        energy:    data.tone.energy.score,
        wpm:       data.pace.wpm,
        fillerCount: data.filler_words.total,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Analysis failed — make sure the backend is running.");
    } finally {
      setAnalyzing(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎤</span>
          <span className="font-semibold text-white text-sm">Voice Analysis</span>
        </div>
        {recording && (
          <div className="flex items-center gap-2 text-red-400 text-xs font-mono animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            {formatTime(elapsed)}
          </div>
        )}
      </div>

      {/* Record Button */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={recording ? stopRecording : startRecording}
          disabled={analyzing}
          className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all duration-200
            ${recording
              ? "bg-red-600 hover:bg-red-700 scale-105 ring-4 ring-red-500/40"
              : analyzing
              ? "bg-slate-600 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700 hover:scale-105"
            }`}
        >
          {analyzing ? "⏳" : recording ? "⏹" : "🎙"}
        </button>
        <p className="text-xs text-slate-400">
          {analyzing
            ? "Analyzing with Whisper + Librosa…"
            : recording
            ? "Recording — click to stop"
            : result
            ? "Record again to replace"
            : "Click to start recording your answer"}
        </p>
      </div>

      {/* Playback */}
      {audioURL && !analyzing && (
        <audio controls src={audioURL} className="w-full h-8 rounded-lg" />
      )}

      {/* Error */}
      {error && (
        <div className="text-xs text-red-400 bg-red-900/20 border border-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Results */}
      {result && !analyzing && (
        <div className="flex flex-col gap-4">
          {/* Overall Score */}
          <div className={`rounded-xl p-3 text-center border
            ${result.overall_score >= 80 ? "bg-green-900/30 border-green-700" :
              result.overall_score >= 55 ? "bg-yellow-900/30 border-yellow-700" :
              "bg-red-900/30 border-red-700"}`}>
            <div className={`text-3xl font-black ${
              result.overall_score >= 80 ? "text-green-400" :
              result.overall_score >= 55 ? "text-yellow-400" : "text-red-400"}`}>
              {result.overall_score}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Voice Score</div>
          </div>

          {/* Metric Bars */}
          <div>
            <MetricBar
              label={`Clarity  •  ${result.pace.wpm} WPM`}
              score={result.pace.score}
              feedback={result.pace.feedback}
            />
            <MetricBar
              label={`Filler Words  •  ${result.filler_words.total} detected`}
              score={result.filler_words.score}
              feedback={result.filler_words.feedback}
            />
            <MetricBar
              label="Vocal Tone"
              score={result.tone.pitch.score}
              feedback={result.tone.pitch.feedback}
            />
            <MetricBar
              label="Energy & Volume"
              score={result.tone.energy.score}
              feedback={result.tone.energy.feedback}
            />
          </div>

          {/* Top Filler Words */}
          {result.filler_words.top?.length > 0 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Most-used fillers:</p>
              <div className="flex flex-wrap gap-2">
                {result.filler_words.top.map(([word, count]) => (
                  <span key={word} className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-700 rounded-full px-2 py-0.5">
                    "{word}" ×{count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Transcript */}
          <div>
            <p className="text-xs text-slate-400 font-medium mb-2">
              Transcript <span className="text-slate-600">(fillers highlighted)</span>
            </p>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto">
              <HighlightedTranscript
                text={result.transcript}
                fillerCounts={result.filler_words.counts}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}