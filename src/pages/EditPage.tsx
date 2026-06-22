import { useState, useRef, useCallback, useEffect } from "react";

import { expandPrompt, INITIAL_EDIT_SESSION, type EditSessionState, type EditMode, CREDIT_COSTS } from "@/lib/aiEngine";



function useEditSession() {

  const [session, setSession] = useState<EditSessionState>(INITIAL_EDIT_SESSION);

  const abortRef = useRef<AbortController | null>(null);



  const reset = useCallback(() => {

    abortRef.current?.abort();

    abortRef.current = null;

    if (session.sourcePreviewUrl?.startsWith("blob:")) {

      URL.revokeObjectURL(session.sourcePreviewUrl);

    }

    setSession({ ...INITIAL_EDIT_SESSION });

  }, [session.sourcePreviewUrl]);



  const update = useCallback(

    (patch: Partial<EditSessionState>) =>

      setSession((prev) => ({ ...prev, ...patch })),

    []

  );



  return { session, update, reset, abortRef };

}



function UploadZone({ onFile, mode, disabled }: { onFile: (file: File) => void; mode: EditMode; disabled?: boolean; }) {

  const [dragging, setDragging] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  const accept = mode === "image" ? "image/jpeg,image/png,image/webp" : "video/mp4,video/mov,video/webm";



  return (

    <div

      onClick={() => !disabled && inputRef.current?.click()}

      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}

      onDragLeave={() => setDragging(false)}

      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}

      style={{

        border: `2px dashed ${dragging ? "#6366f1" : "#e5e7eb"}`,

        borderRadius: 16, padding: 48, textAlign: "center",

        cursor: disabled ? "not-allowed" : "pointer",

        background: dragging ? "#f0f0ff" : "#fafafa",

        transition: "all 0.2s", opacity: disabled ? 0.5 : 1,

      }}

    >

      <div style={{ fontSize: 52 }}>{mode === "image" ? "🖼️" : "🎬"}</div>

      <p style={{ margin: "12px 0 4px", fontWeight: 700, fontSize: 17 }}>Drop your {mode === "image" ? "image" : "video"} here</p>

      <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>or click to browse — {mode === "image" ? "JPG, PNG, WebP" : "MP4, MOV, WebM"}</p>

      <input ref={inputRef} type="file" accept={accept} style={{ display: "none" }}

        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />

    </div>

  );

}



function CompareSlider({ original, edited }: { original: string; edited: string; }) {

  const [position, setPosition] = useState(50);

  const containerRef = useRef<HTMLDivElement>(null);

  const dragging = useRef(false);



  const updatePos = (clientX: number) => {

    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    setPosition(Math.min(Math.max(((clientX - rect.left) / rect.width) * 100, 0), 100));

  };



  return (

    <div ref={containerRef} style={{ position: "relative", overflow: "hidden", borderRadius: 14, cursor: "ew-resize", userSelect: "none" }}

      onMouseDown={(e) => { dragging.current = true; updatePos(e.clientX); }}

      onMouseMove={(e) => { if (dragging.current) updatePos(e.clientX); }}

      onMouseUp={() => { dragging.current = false; }}

      onMouseLeave={() => { dragging.current = false; }}

      onTouchStart={(e) => updatePos(e.touches[0].clientX)}

      onTouchMove={(e) => updatePos(e.touches[0].clientX)}

    >

      <img src={edited} alt="Edited" style={{ width: "100%", display: "block" }} />

      <div style={{ position: "absolute", inset: 0, clipPath: `inset(0 ${100 - position}% 0 0)` }}>

        <img src={original} alt="Original" style={{ width: "100%", display: "block" }} />

      </div>

      <div style={{ position: "absolute", top: 0, bottom: 0, left: `${position}%`, width: 3, background: "#fff", transform: "translateX(-50%)", boxShadow: "0 0 8px rgba(0,0,0,0.4)" }}>

        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 34, height: 34, borderRadius: "50%", background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>↔</div>

      </div>

      <div style={{ position: "absolute", top: 8, left: 8, background: "rgba(0,0,0,0.6)", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>Original</div>

      <div style={{ position: "absolute", top: 8, right: 8, background: "rgba(99,102,241,0.9)", color: "#fff", padding: "3px 10px", borderRadius: 6, fontSize: 12 }}>Edited</div>

    </div>

  );

}



function ProgressBar({ percent, label }: { percent: number; label: string; }) {

  return (

    <div style={{ marginTop: 18 }}>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7 }}>

        <span style={{ fontSize: 13, color: "#6366f1", fontWeight: 600 }}>{label}</span>

        <span style={{ fontSize: 13, color: "#9ca3af" }}>{Math.round(percent)}%</span>

      </div>

      <div style={{ height: 7, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>

        <div style={{ height: "100%", width: `${percent}%`, background: "linear-gradient(90deg,#6366f1,#818cf8)", borderRadius: 99, transition: "width 0.4s ease" }} />

      </div>

    </div>

  );

}



function IntentPreview({ prompt, style, strength, steps }: { prompt: string; style: string; strength: number; steps: number; }) {

  const [expanded, setExpanded] = useState(false);

  return (

    <div style={{ background: "#f0f0ff", border: "1px solid #c7d2fe", borderRadius: 12, padding: 16, marginTop: 12 }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(!expanded)}>

        <span style={{ fontSize: 13, fontWeight: 700, color: "#4f46e5" }}>✨ AI understood your intent</span>

        <span style={{ fontSize: 12, color: "#818cf8" }}>{expanded ? "hide" : "show details"}</span>

      </div>

      {expanded && (

        <div style={{ marginTop: 12 }}>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" as const, marginBottom: 10 }}>

            <span style={{ background: "#4f46e5", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>{style}</span>

            <span style={{ background: "#7c3aed", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>strength {Math.round(strength * 100)}%</span>

            <span style={{ background: "#6d28d9", color: "#fff", borderRadius: 6, padding: "2px 10px", fontSize: 12 }}>{steps} steps</span>

          </div>

          <p style={{ margin: 0, fontSize: 12, color: "#4338ca", lineHeight: 1.7 }}>{prompt}</p>

        </div>

      )}

    </div>

  );

}



export default function EditPage() {

  const { session, update, reset, abortRef } = useEditSession();

  const [progress, setProgress] = useState(0);

  const [progressLabel, setProgressLabel] = useState("");

  const [previewIntent, setPreviewIntent] = useState<Awaited<ReturnType<typeof expandPrompt>> | null>(null);

  const [resultUrl, setResultUrl] = useState<string | null>(null);



  useEffect(() => () => { abortRef.current?.abort(); }, []);



  const handleFile = (file: File) => {

    const previewUrl = URL.createObjectURL(file);

    update({ sourceFile: file, sourcePreviewUrl: previewUrl, status: "idle", outputUrl: null, errorMessage: null });

    setResultUrl(null);

    setPreviewIntent(null);

    setProgress(0);

  };



  const handlePromptBlur = async () => {

    if (!session.userPrompt.trim() || session.userPrompt.length < 3) return;

    try {

      const intent = await expandPrompt(session.userPrompt, session.mode);

      setPreviewIntent(intent);

    } catch { }

  };



  const handleSubmit = async () => {

    if (!session.sourceFile || !session.userPrompt.trim()) return;

    abortRef.current = new AbortController();

    update({ status: "processing", errorMessage: null });

    setResultUrl(null);

    setProgress(0);



    try {

      setProgressLabel("Analyzing your image...");

      setProgress(10);

      await new Promise((r) => setTimeout(r, 600));



      setProgressLabel("Understanding your intent...");

      setProgress(25);

      const intent = await expandPrompt(session.userPrompt, session.mode);

      setPreviewIntent(intent);



      setProgressLabel("Preparing edit...");

      setProgress(45);

      await new Promise((r) => setTimeout(r, 500));



      setProgressLabel(session.mode === "image" ? "Generating edit..." : "Generating video...");

      setProgress(70);

      await new Promise((r) => setTimeout(r, 1200));



      setProgressLabel("Finalizing...");

      setProgress(90);

      await new Promise((r) => setTimeout(r, 400));



      setProgress(100);

      setProgressLabel("Complete!");

      setResultUrl(session.sourcePreviewUrl!);

      update({ status: "done", outputUrl: session.sourcePreviewUrl! });

    } catch (err) {

      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";

      update({ status: "error", errorMessage: msg });

    }

  };



  const handleCancel = () => {

    abortRef.current?.abort();

    update({ status: "idle" });

    setProgress(0);

    setProgressLabel("");

  };



  const handleNewEdit = () => {

    reset();

    setResultUrl(null);

    setPreviewIntent(null);

    setProgress(0);

    setProgressLabel("");

  };



  const handleDownload = () => {

    if (!resultUrl) return;

    const a = document.createElement("a");

    a.href = resultUrl;

    a.download = `motio2edit-${Date.now()}.${session.mode === "image" ? "jpg" : "mp4"}`;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    handleNewEdit();

  };



  const isProcessing = session.status === "processing";

  const isDone = session.status === "done";



  return (

    <div style={{ maxWidth: 700, margin: "0 auto", padding: "28px 16px", fontFamily: "'Inter',-apple-system,sans-serif" }}>

      <div style={{ marginBottom: 28 }}>

        <h1 style={{ fontSize: 30, fontWeight: 800, margin: 0 }}>MOTIO<span style={{ color: "#6366f1" }}>2EDIT</span></h1>

        <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: 14 }}>AI-powered image and video editing</p>

      </div>



      <div style={{ display: "flex", gap: 8, marginBottom: 22 }}>

        {(["image", "video"] as EditMode[]).map((m) => (

          <button key={m} onClick={() => !isProcessing && update({ mode: m })}

            style={{ padding: "9px 22px", borderRadius: 10, border: "none", cursor: isProcessing ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 14, background: session.mode === m ? "#6366f1" : "#f3f4f6", color: session.mode === m ? "#fff" : "#374151", transition: "all 0.15s" }}>

            {m === "image" ? "🖼 Image" : "🎬 Video"}

          </button>

        ))}

      </div>



      {!session.sourcePreviewUrl ? (

        <UploadZone onFile={handleFile} mode={session.mode} disabled={isProcessing} />

      ) : (

        <div style={{ position: "relative" }}>

          {isDone && resultUrl && session.mode === "image" ? (

            <CompareSlider original={session.sourcePreviewUrl!} edited={resultUrl} />

          ) : (

            <img src={session.sourcePreviewUrl} alt="Source" style={{ width: "100%", borderRadius: 14, maxHeight: 420, objectFit: "contain", background: "#f3f4f6" }} />

          )}

          {!isProcessing && (

            <button onClick={handleNewEdit}

              style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: 8, padding: "5px 13px", cursor: "pointer", fontSize: 12 }}>

              ✕ New Edit

            </button>

          )}

        </div>

      )}



      {isDone && resultUrl && session.mode === "video" && (

        <div style={{ marginTop: 16 }}>

          <video src={resultUrl} controls autoPlay loop style={{ width: "100%", borderRadius: 14 }} />

        </div>

      )}



      {session.mode === "video" && !isDone && (

        <div style={{ marginTop: 18 }}>

          <label style={{ fontSize: 13, fontWeight: 700, color: "#374151" }}>

            Duration: {session.videoDurationSeconds}s

            <span style={{ fontWeight: 400, color: "#9ca3af", marginLeft: 8 }}>

              ({CREDIT_COSTS[session.videoDurationSeconds <= 5 ? "video_5s" : session.videoDurationSeconds <= 8 ? "video_8s" : session.videoDurationSeconds <= 12 ? "video_12s" : "video_16s"]} credits)

            </span>

          </label>

          <input type="range" min={5} max={16} step={1} value={session.videoDurationSeconds}

            onChange={(e) => update({ videoDurationSeconds: Number(e.target.value) })}

            style={{ width: "100%", marginTop: 8 }} disabled={isProcessing} />

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af" }}>

            <span>5s</span><span>8s</span><span>12s</span><span>16s</span>

          </div>

        </div>

      )}



      <div style={{ marginTop: 20 }}>

        <textarea value={session.userPrompt}

          onChange={(e) => update({ userPrompt: e.target.value })}

          onBlur={handlePromptBlur}

          placeholder={session.mode === "image" ? "Describe your edit... e.g. 'make it cinematic' or 'add golden hour lighting'" : "Describe your video... e.g. 'slow motion ocean waves at sunset'"}

          disabled={isProcessing} rows={3}

          style={{ width: "100%", padding: 14, borderRadius: 12, border: "1.5px solid #e5e7eb", fontSize: 15, resize: "none", outline: "none", fontFamily: "inherit", boxSizing: "border-box" as const }} />

      </div>



      {previewIntent && !isDone && (

        <IntentPreview prompt={previewIntent.professionalPrompt} style={previewIntent.style} strength={previewIntent.strength} steps={previewIntent.steps} />

      )}



      {isProcessing && <ProgressBar percent={progress} label={progressLabel} />}



      {session.errorMessage && (

        <div style={{ marginTop: 12, padding: 13, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, color: "#dc2626", fontSize: 13 }}>

          {session.errorMessage}

        </div>

      )}



      <div style={{ marginTop: 20, display: "flex", gap: 10 }}>

        {!isDone ? (

          <>

            <button onClick={handleSubmit}

              disabled={isProcessing || !session.sourceFile || !session.userPrompt.trim()}

              style={{ flex: 1, padding: "15px 24px", background: isProcessing ? "#c7d2fe" : "#6366f1", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: isProcessing || !session.sourceFile ? "not-allowed" : "pointer", transition: "all 0.15s" }}>

              {isProcessing ? "Processing..." : "Generate Edit"}

            </button>

            {isProcessing && (

              <button onClick={handleCancel}

                style={{ padding: "15px 20px", background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>

                ✕ Cancel

              </button>

            )}

          </>

        ) : (

          <>

            <button onClick={handleDownload}

              style={{ flex: 1, padding: "15px 24px", background: "#059669", color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 800, cursor: "pointer" }}>

              ⬇ Download

            </button>

            <button onClick={handleNewEdit}

              style={{ padding: "15px 20px", background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>

              New Edit

            </button>

          </>

        )}

      </div>



      {isDone && previewIntent && (

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" as const }}>

          {[

            { label: "Style", value: previewIntent.style },

            { label: "Steps", value: previewIntent.steps },

            { label: "Strength", value: `${Math.round(previewIntent.strength * 100)}%` },

          ].map((stat) => (

            <div key={stat.label} style={{ background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, padding: "8px 16px", textAlign: "center" as const }}>

              <div style={{ fontSize: 11, color: "#9ca3af", marginBottom: 2 }}>{stat.label}</div>

              <div style={{ fontSize: 14, fontWeight: 700, color: "#111827" }}>{stat.value}</div>

            </div>

          ))}

        </div>

      )}

    </div>

  );

}
