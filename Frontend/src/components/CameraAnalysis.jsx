// frontend/src/components/CameraAnalysis.jsx
import { useEffect, useRef, useState, useCallback } from "react";

// ── CDN loader (deduplicates script tags) ────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const el = document.createElement("script");
    el.src = src; el.crossOrigin = "anonymous";
    el.onload = resolve; el.onerror = reject;
    document.head.appendChild(el);
  });
}

// ── Metric calculators ───────────────────────────────────────────

const rollingAvg = (arr) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

function irisCenter(lms, indices) {
  const pts = indices.map((i) => lms[i]);
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

/** Eye contact: how centred each iris is within its eye socket (0–100) */
function calcEyeContact(lms) {
  if (!lms) return 50;
  if (lms.length < 478) return calcFaceForward(lms); // no iris data → fallback

  const li     = irisCenter(lms, [468, 469, 470, 471, 472]);
  const lOuter = lms[33], lInner = lms[133];
  const lc     = (lOuter.x + lInner.x) / 2;
  const lw     = Math.abs(lInner.x - lOuter.x) + 0.001;
  const lDev   = Math.abs(li.x - lc) / (lw / 2);

  const ri     = irisCenter(lms, [473, 474, 475, 476, 477]);
  const rOuter = lms[362], rInner = lms[263];
  const rc     = (rOuter.x + rInner.x) / 2;
  const rw     = Math.abs(rInner.x - rOuter.x) + 0.001;
  const rDev   = Math.abs(ri.x - rc) / (rw / 2);

  return Math.max(0, Math.min(100, Math.round((1 - (lDev + rDev) / 2) * 100)));
}

/** Fallback when iris landmarks unavailable: use nose-tip symmetry */
function calcFaceForward(lms) {
  if (!lms) return 50;
  const nose = lms[1];
  const lc   = lms[234], rc = lms[454];
  const cx   = (lc.x + rc.x) / 2;
  const fw   = Math.abs(rc.x - lc.x) + 0.001;
  const off  = Math.abs(nose.x - cx) / (fw / 2);
  return Math.max(0, Math.min(100, Math.round((1 - off) * 100)));
}

/** Head tilt in degrees via eye-line slope */
function calcHeadTilt(lms) {
  if (!lms) return 0;
  const le = { x: (lms[33].x + lms[133].x) / 2, y: (lms[33].y + lms[133].y) / 2 };
  const re = { x: (lms[362].x + lms[263].x) / 2, y: (lms[362].y + lms[263].y) / 2 };
  return Math.round(Math.atan2(re.y - le.y, re.x - le.x) * (180 / Math.PI) * 10) / 10;
}

/** How centred the face bounding box is in frame (100 = perfect) */
function calcCentering(lms) {
  if (!lms) return 50;
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const lm of lms) {
    if (lm.x < minX) minX = lm.x;
    if (lm.x > maxX) maxX = lm.x;
    if (lm.y < minY) minY = lm.y;
    if (lm.y > maxY) maxY = lm.y;
  }
  const dx   = Math.abs((minX + maxX) / 2 - 0.5);
  const dy   = Math.abs((minY + maxY) / 2 - 0.42); // slightly above center is natural
  const dist = Math.sqrt(dx * dx + dy * dy);
  return Math.max(0, Math.min(100, Math.round((1 - dist * 3.5) * 100)));
}

/** Posture: blend of tilt penalty + centering */
function calcPosture(tilt, centering) {
  return Math.round(Math.max(0, 100 - Math.abs(tilt) * 4) * 0.55 + centering * 0.45);
}

// ── MetricBar ────────────────────────────────────────────────────

function MetricBar({ label, icon, value, barColor }) {
  const textColor =
    value >= 70 ? "text-emerald-600" : value >= 45 ? "text-amber-600" : "text-rose-500";
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-semibold text-gray-600">{icon} {label}</span>
        <span className={`text-[11px] font-bold tabular-nums ${textColor}`}>{value}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────

export default function CameraAnalysis({ isActive = true, onMetricsUpdate }) {
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef   = useRef(null);
  const frameRef    = useRef(0);
  const histRef     = useRef({ ec: [], ps: [], cn: [] });

  const [status, setStatus] = useState("idle"); // idle|loading|active|denied|error
  const [live,   setLive]   = useState({ eyeContact: 0, posture: 0, centering: 0, tilt: 0, face: false });
  const [smooth, setSmooth] = useState({ eyeContact: 0, posture: 0, centering: 0 });

  // Rolling-average updater — ref-based to avoid stale closures
  const tick = useCallback((m) => {
    const h = histRef.current;
    const N = 90; // ~3 s at 30 fps
    h.ec = [...h.ec, m.eyeContact].slice(-N);
    h.ps = [...h.ps, m.posture].slice(-N);
    h.cn = [...h.cn, m.centering].slice(-N);
    if (frameRef.current % 8 === 0) {
      const s = { eyeContact: rollingAvg(h.ec), posture: rollingAvg(h.ps), centering: rollingAvg(h.cn) };
      setSmooth(s);
      onMetricsUpdate?.(s);
    }
  }, [onMetricsUpdate]);

  useEffect(() => {
    if (!isActive) return;
    let dead = false;

    async function boot() {
      setStatus("loading");
      try {
        // Load MediaPipe from CDN — no npm install required
        await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"),
        ]);
        if (dead) return;

        // Camera stream
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
        });
        if (dead) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) videoRef.current.srcObject = stream;

        // FaceMesh with iris refinement
        const fm = new window.FaceMesh({
          locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${f}`,
        });
        fm.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,         // enables iris landmarks 468–477
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        fm.onResults((res) => {
          if (!canvasRef.current || !videoRef.current) return;
          const cvs = canvasRef.current;
          const ctx = cvs.getContext("2d");
          cvs.width  = videoRef.current.videoWidth  || 640;
          cvs.height = videoRef.current.videoHeight || 480;

          // Mirror the draw so it looks like a selfie
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-cvs.width, 0);
          ctx.drawImage(res.image, 0, 0);
          ctx.restore();

          if (res.multiFaceLandmarks?.length) {
            const lms  = res.multiFaceLandmarks[0];
            // Mirror landmark x-coordinates to match the flipped canvas
            const mlms = lms.map((lm) => ({ ...lm, x: 1 - lm.x }));

            // Mesh overlays
            window.drawConnectors(ctx, mlms, window.FACEMESH_TESSELATION,
              { color: "#FFFFFF15", lineWidth: 0.4 });
            window.drawConnectors(ctx, mlms, window.FACEMESH_FACE_OVAL,
              { color: "#93C5FD70", lineWidth: 1.5 });
            window.drawConnectors(ctx, mlms, window.FACEMESH_LEFT_EYE,
              { color: "#4ADE80", lineWidth: 1.5 });
            window.drawConnectors(ctx, mlms, window.FACEMESH_RIGHT_EYE,
              { color: "#4ADE80", lineWidth: 1.5 });
            if (lms.length >= 478) {
              window.drawConnectors(ctx, mlms, window.FACEMESH_LEFT_IRIS,
                { color: "#F87171", lineWidth: 1.5 });
              window.drawConnectors(ctx, mlms, window.FACEMESH_RIGHT_IRIS,
                { color: "#F87171", lineWidth: 1.5 });
            }

            // Calculate metrics every 3 frames
            frameRef.current++;
            if (frameRef.current % 3 === 0) {
              const ec = calcEyeContact(lms);
              const tl = calcHeadTilt(lms);
              const cn = calcCentering(lms);
              const ps = calcPosture(tl, cn);
              const m  = { eyeContact: ec, posture: ps, centering: cn, tilt: tl, face: true };
              setLive(m);
              tick(m);
            }
          } else {
            setLive((p) => ({ ...p, face: false }));
          }
        });

        faceMeshRef.current = fm;

        const cam = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (faceMeshRef.current && videoRef.current) {
              await faceMeshRef.current.send({ image: videoRef.current });
            }
          },
          width: 640, height: 480,
        });
        await cam.start();
        cameraRef.current = cam;
        if (!dead) setStatus("active");

      } catch (err) {
        if (!dead) {
          console.error("CameraAnalysis boot error:", err);
          setStatus(err.name === "NotAllowedError" ? "denied" : "error");
        }
      }
    }

    boot();
    return () => {
      dead = true;
      try { cameraRef.current?.stop?.(); }    catch {}
      try { faceMeshRef.current?.close?.(); } catch {}
      try { videoRef.current?.srcObject?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, [isActive, tick]);

  // ── Coaching tip ─────────────────────────────────────────────
  const tip = (() => {
    if (!live.face || status !== "active") return null;
    if (smooth.eyeContact < 50)           return { icon: "👁️", msg: "Look directly at the camera lens",          color: "text-amber-600" };
    if (Math.abs(live.tilt) > 8)          return { icon: "↺",  msg: `Tilt detected — straighten your head`,      color: "text-amber-600" };
    if (smooth.centering < 50)            return { icon: "🎯", msg: "Move so your face fills the centre",         color: "text-amber-600" };
    if (smooth.eyeContact >= 70 && smooth.posture >= 70)
                                          return { icon: "✅", msg: "Great presence — keep it up!",               color: "text-emerald-600" };
    return null;
  })();

  // ── Error states ─────────────────────────────────────────────
  if (status === "denied") return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
      <div className="text-3xl mb-2">🚫</div>
      <p className="text-sm font-semibold text-gray-700">Camera Access Denied</p>
      <p className="text-xs text-gray-400 mt-1">
        Click the camera icon in your browser's address bar and allow access
      </p>
    </div>
  );
  if (status === "error") return (
    <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
      <div className="text-3xl mb-2">⚠️</div>
      <p className="text-sm font-semibold text-gray-700">Camera Error</p>
      <p className="text-xs text-gray-400 mt-1">Reload the page and try again</p>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">

      {/* Video + canvas */}
      <div className="relative bg-gray-900" style={{ aspectRatio: "4/3" }}>
        {/* Video is hidden — canvas shows the mirrored, annotated feed */}
        <video ref={videoRef} autoPlay playsInline muted
          className="absolute inset-0 w-full h-full object-cover opacity-0" />
        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover" />

        {/* Loading overlay */}
        {status === "loading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 gap-3">
            <svg className="animate-spin h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <div className="text-center">
              <p className="text-white text-xs font-semibold">Initialising AI Vision</p>
              <p className="text-gray-500 text-[10px] mt-0.5">Downloading MediaPipe models…</p>
            </div>
          </div>
        )}

        {/* No-face message */}
        {status === "active" && !live.face && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-black/55 text-white text-[11px] px-3 py-1 rounded-full">
              👤 Position your face in frame
            </span>
          </div>
        )}

        {/* LIVE badge */}
        {status === "active" && live.face && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5
                          bg-black/50 backdrop-blur-sm rounded-full px-2.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-[10px] font-semibold tracking-wide">LIVE</span>
          </div>
        )}

        {/* Eye-contact live pill */}
        {status === "active" && live.face && (
          <div className={`absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1
                           rounded-full transition-colors ${
            live.eyeContact >= 70 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
          }`}>
            👁️ {live.eyeContact}%
          </div>
        )}

        {/* Tilt warning */}
        {status === "active" && live.face && Math.abs(live.tilt) > 8 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="bg-amber-500/90 backdrop-blur-sm text-white text-[10px]
                             font-semibold px-3 py-1 rounded-full">
              ↺ Head tilted {Math.abs(live.tilt).toFixed(0)}°
            </span>
          </div>
        )}
      </div>

      {/* Metrics panel */}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Live Analysis
          </p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            live.face ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400"
          }`}>
            {live.face ? "● Tracking" : "○ Searching"}
          </span>
        </div>

        <MetricBar label="Eye Contact"  icon="👁️" value={smooth.eyeContact} barColor="bg-blue-500"   />
        <MetricBar label="Head Posture" icon="🧍" value={smooth.posture}    barColor="bg-violet-500" />
        <MetricBar label="Frame Centre" icon="🎯" value={smooth.centering}  barColor="bg-teal-500"   />

        {tip && (
          <div className="pt-1.5 border-t border-gray-50">
            <p className={`text-[11px] leading-relaxed ${tip.color}`}>
              {tip.icon} {tip.msg}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}