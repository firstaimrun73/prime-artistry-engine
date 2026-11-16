import type { ReactNode, ChangeEvent } from "react";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { createFileRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  ArrowUp,
  Paperclip,
  X,
  Download,
  Loader2,
  Lock,
  Mic,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type StudioTier } from "@/lib/studio/studio-tier";
import { generateMedia } from "@/lib/generate.functions";
import { uploadToStorage } from "@/lib/editor/editor.utils";
import {
  startGeneration,
  setGenerationStage,
  completeGeneration,
  failGeneration,
  endGeneration,
  useInFlightStageAdvance,
} from "@/lib/generation-status";
import { toast } from "sonner";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Create images, videos and music in one AI workspace.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

type AttachedItem = { id: string; file: File; preview: string };

type ChatItem =
  | { id: string; role: "user"; text: string; mode: StudioMode; previews?: string[] }
  | {
      id: string;
      role: "assistant";
      kind: "image";
      prompt: string;
      url: string;
      watermarked: boolean;
    };

const IMAGE_ASPECTS = ["auto", "1:1", "4:3", "3:2", "16:9", "9:16", "3:4"] as const;
const VIDEO_ASPECTS = ["auto", "16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS = [5, 10, 15] as const;

const EXAMPLES: Record<StudioMode, string[]> = {
  image: [
    "A cinematic portrait in golden-hour lighting.",
    "A product photo of a glass bottle on marble, soft studio light.",
    "An illustration of a quiet rainy city street at night.",
  ],
  video: [
    "A futuristic city with flying vehicles at sunset.",
    "Slow drone shot over misty mountains at sunrise.",
    "Close-up of coffee pouring into a cup, steam rising.",
  ],
  music: [
    "A relaxing piano instrumental for a peaceful evening.",
    "Upbeat indie pop with warm acoustic guitar.",
    "Dark cinematic score with deep drums and strings.",
  ],
};

const MAX_FILE_MB = 12;

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <UnifiedAiStudio />;
}

function UnifiedAiStudio() {
  const { profile, refreshProfile, user } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const generate = useServerFn(generateMedia);
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const paid = admin || isPaidPlan(plan);
  const free = !paid;
  const videoOk =
    admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk =
    admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  const [mode, setMode] = useState<StudioMode>("image");
  const [tier, setTier] = useState<StudioTier>("standard");
  const [prompt, setPrompt] = useState("");
  const [attached, setAttached] = useState<AttachedItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const [imageAspect, setImageAspect] = useState<string>("auto");
  const [videoAspect, setVideoAspect] = useState<string>("auto");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [musicKind, setMusicKind] = useState<"song" | "instrumental">("song");

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);
  const multiBlocked = free && attached.length > 1;
  const tierBlocked = free && tier !== "standard";
  const needsUpgrade = modeLocked || multiBlocked || tierBlocked;

  const credits = profile?.credits ?? 0;
  const canGenerate =
    !busy &&
    !needsUpgrade &&
    (prompt.trim().length > 0 || (mode === "image" && attached.length > 0));

  useInFlightStageAdvance(busy && mode === "image");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat, busy, statusText]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      attached.forEach((a) => URL.revokeObjectURL(a.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const placeholder =
    mode === "image"
      ? attached.length > 0
        ? "Describe the change you want for this reference…"
        : "Describe the image you want to create…"
      : mode === "video"
        ? "Describe the video you want to create…"
        : "Describe your song, soundtrack or instrumental…";

  const clearAttachments = useCallback(() => {
    setAttached((prev) => {
      prev.forEach((a) => URL.revokeObjectURL(a.preview));
      return [];
    });
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const removeAttachment = (id: string) => {
    setAttached((prev) => {
      const hit = prev.find((a) => a.id === id);
      if (hit) URL.revokeObjectURL(hit.preview);
      return prev.filter((a) => a.id !== id);
    });
  };

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const next: AttachedItem[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      if (!file.type.startsWith("image/")) continue;
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        toast.error(`Each image must be under ${MAX_FILE_MB}MB`);
        continue;
      }
      next.push({
        id: `${Date.now()}-${i}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setAttached((prev) => [...prev, ...next].slice(0, paid ? 10 : 5));
    if (fileRef.current) fileRef.current.value = "";
  };

  const switchMode = (m: StudioMode) => {
    if ((m === "video" && !videoOk) || (m === "music" && !musicOk)) {
      navigate({ to: "/pricing" });
      return;
    }
    setMode(m);
    setAdvancedOpen(false);
    if (m !== "image") clearAttachments();
  };

  const toggleMic = () => {
    type Rec = {
      continuous: boolean;
      interimResults: boolean;
      lang: string;
      start: () => void;
      stop: () => void;
      onresult: ((e: {
        results: { [i: number]: { [j: number]: { transcript: string } } };
      }) => void) | null;
      onend: (() => void) | null;
      onerror: (() => void) | null;
    };
    const W = window as unknown as {
      SpeechRecognition?: new () => Rec;
      webkitSpeechRecognition?: new () => Rec;
    };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) {
      toast.message("Voice input is not supported in this browser");
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const t = e.results?.[0]?.[0]?.transcript;
      if (typeof t === "string" && t.trim()) {
        setPrompt((p) => (p ? `${p} ${t}` : t).trim());
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      toast.error("Could not start microphone");
      setListening(false);
    }
  };

  const onGenerate = async () => {
    if (busy) return;
    if (needsUpgrade) {
      navigate({ to: "/pricing" });
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed && !(mode === "image" && attached.length > 0)) {
      toast.error("Enter a prompt to generate.");
      return;
    }

    if (mode === "video") {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({
            prompt: trimmed || undefined,
            mode: "video",
            experience: tier,
            aspectRatio: videoAspect === "auto" ? undefined : videoAspect,
            duration: videoDuration,
          }),
        );
      } catch {
        /* ignore */
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (mode === "music") {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({
            prompt: trimmed || undefined,
            mode: "music",
            musicKind,
            experience: tier,
          }),
        );
      } catch {
        /* ignore */
      }
      navigate({ to: "/music" });
      return;
    }

    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    setBusy(true);
    setLastError(null);
    setStatusText("Preparing…");
    startGeneration("image", "/studio");

    setChat((prev) => [
      ...prev,
      {
        id: `${Date.now()}-u`,
        role: "user",
        text: trimmed || "(edit image)",
        mode: "image",
        previews: attached.map((a) => a.preview),
      },
    ]);

    try {
      let imageUrl: string | undefined;
      if (attached[0]) {
        setStatusText("Uploading reference…");
        setGenerationStage("PREPARING");
        imageUrl = await uploadToStorage(
          attached[0].file,
          profile?.id ?? user.id ?? "anon",
        );
        if (!imageUrl?.startsWith("https://")) {
          throw new Error("Upload failed. Try a smaller image.");
        }
      }

      setStatusText("Generating image…");
      setGenerationStage("GENERATING");

      const aspectPayload = imageAspect === "auto" ? undefined : imageAspect;

      const res = (await generate({
        data: {
          type: "image",
          prompt: trimmed || "Enhance this image",
          imageUrl: imageUrl ?? null,
          aspectRatio: aspectPayload ?? null,
          studioTier: tier,
          imageQuality: tier === "standard" ? "sd" : "hd",
        },
      })) as { outputUrl?: string; url?: string; error?: string };

      const outputUrl = res?.outputUrl || res?.url;
      if (!outputUrl || typeof outputUrl !== "string" || !outputUrl.startsWith("http")) {
        throw new Error(
          (res as { message?: string })?.message ||
            res?.error ||
            "No image returned.",
        );
      }

      completeGeneration();
      setChat((prev) => [
        ...prev,
        {
          id: `${Date.now()}-a`,
          role: "assistant",
          kind: "image",
          prompt: trimmed || "(edit)",
          url: outputUrl,
          watermarked: free,
        },
      ]);
      setStatusText(null);
      setPrompt("");
      clearAttachments();
      toast.success("Image ready");
      try {
        await refreshProfile?.();
      } catch {
        /* ignore */
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Generation failed.";
      failGeneration(message);
      setLastError(message);
      setStatusText(null);
      toast.error(message);
    } finally {
      setBusy(false);
      setTimeout(() => endGeneration(), 800);
    }
  };

  const empty = chat.length === 0 && !busy;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-5">
        {/* TOP — prominent mode selector */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div
            className="inline-flex flex-1 rounded-xl border border-border bg-muted/30 p-1"
            role="tablist"
            aria-label="Creation mode"
          >
            <ModeTab
              active={mode === "image"}
              onClick={() => switchMode("image")}
              icon={<ImageIcon className="h-4 w-4" />}
              label="Image"
            />
            <ModeTab
              active={mode === "video"}
              onClick={() => switchMode("video")}
              icon={<Video className="h-4 w-4" />}
              label="Video"
              locked={!videoOk}
            />
            <ModeTab
              active={mode === "music"}
              onClick={() => switchMode("music")}
              icon={<Music className="h-4 w-4" />}
              label="Music"
              locked={!musicOk}
            />
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2.5 py-1.5 text-xs font-semibold tabular-nums"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        {/* Workspace */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
          {empty && (
            <div className="flex flex-1 flex-col items-center justify-center px-2 py-8 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                What do you want to create?
              </h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Create stunning images, videos and music with one simple prompt.
              </p>
              <div className="mt-6 flex w-full max-w-md flex-col gap-2">
                {EXAMPLES[mode].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setPrompt(ex)}
                    className="rounded-xl border border-border bg-card/80 px-3 py-2.5 text-left text-sm text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {chat.map((item) =>
            item.role === "user" ? (
              <div key={item.id} className="flex justify-end">
                <div className="max-w-[90%] rounded-2xl rounded-br-md bg-primary/12 px-3 py-2 text-sm">
                  {item.previews && item.previews.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {item.previews.map((p) => (
                        <img
                          key={p}
                          src={p}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p className="text-foreground">{item.text}</p>
                  <p className="mt-1 text-[10px] capitalize text-muted-foreground">
                    {item.mode} · sent
                  </p>
                </div>
              </div>
            ) : (
              <div key={item.id} className="flex justify-start">
                <div className="max-w-[95%] overflow-hidden rounded-2xl rounded-bl-md border border-border bg-card">
                  <div className="relative">
                    <img
                      src={item.url}
                      alt="Generated"
                      className="max-h-[440px] w-full object-contain bg-muted/15"
                    />
                    {item.watermarked && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                        Motio2edit · Free
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 border-t border-border px-2 py-1.5">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      download
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => setPrompt(item.prompt)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Regenerate
                    </button>
                    {item.watermarked && (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/pricing" })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-secondary"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Remove watermark
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ),
          )}

          {lastError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lastError}
            </div>
          )}

          {busy && statusText && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              {statusText}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <div className="sticky bottom-0 z-20 -mx-3 border-t border-border/70 bg-background/95 px-3 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:-mx-4 sm:px-4">
          {/* Attachment strip — thumbnails only */}
          {attached.length > 0 && mode === "image" && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {attached.map((a) => (
                <div key={a.id} className="relative">
                  <img
                    src={a.preview}
                    alt=""
                    className="h-14 w-14 rounded-xl object-cover ring-1 ring-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeAttachment(a.id)}
                    disabled={busy}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background shadow ring-1 ring-border"
                    aria-label="Remove reference"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {multiBlocked && (
                <p className="text-[11px] text-muted-foreground">
                  Multiple references need a paid plan — Upgrade to generate.
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl border border-border bg-card shadow-md",
              "focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15",
            )}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={3}
              disabled={busy}
              className={cn(
                "w-full resize-none bg-transparent px-4 pt-3 text-[15px] leading-relaxed text-foreground",
                "placeholder:text-muted-foreground/55 focus:outline-none",
                "min-h-[5rem] max-h-[40vh]",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (canGenerate || needsUpgrade) void onGenerate();
                }
              }}
              aria-label="Prompt"
            />

            {/* Toolbar groups */}
            <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 py-2">
              {/* Left: attach + advanced */}
              <button
                type="button"
                onClick={() => {
                  if (mode === "image") fileRef.current?.click();
                  else if (mode === "video") {
                    if (!videoOk) navigate({ to: "/pricing" });
                    else navigate({ to: "/studio/video" });
                  } else if (!musicOk) navigate({ to: "/pricing" });
                  else navigate({ to: "/music" });
                }}
                disabled={busy}
                className={cn(
                  "inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground",
                  attached.length > 0 && "text-primary",
                )}
                title="Add reference"
                aria-label="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setAdvancedOpen((o) => !o)}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground",
                  advancedOpen && "bg-secondary text-foreground",
                )}
                aria-expanded={advancedOpen}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>

              <div className="min-w-0 flex-1" />

              {/* Right: mic + generate */}
              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary",
                  listening && "text-primary",
                )}
                title="Voice input"
                aria-label="Microphone"
              >
                {listening && (
                  <span className="absolute inset-1 animate-ping rounded-xl bg-primary/25" />
                )}
                <Mic className="relative h-4 w-4" />
              </button>

              <Button
                size="sm"
                className="h-10 gap-1.5 rounded-full px-4"
                onClick={() => void onGenerate()}
                disabled={busy || (!canGenerate && !needsUpgrade)}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : needsUpgrade ? (
                  <>
                    Upgrade
                    <Lock className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Generate
                    <ArrowUp className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>

            {/* Advanced settings — mode specific */}
            {advancedOpen && (
              <div className="space-y-3 border-t border-border/60 px-3 py-3 text-sm">
                {mode === "image" && (
                  <>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Aspect ratio
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {IMAGE_ASPECTS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setImageAspect(a)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize",
                              imageAspect === a
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {a === "auto" ? "Auto" : a}
                          </button>
                        ))}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Auto uses the model default — not forced to a fixed ratio.
                      </p>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Experience
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          [
                            ["standard", "Standard"],
                            ["pro", "Premium"],
                            ["premium", "Ultra AI"],
                          ] as const
                        ).map(([id, label]) => {
                          const locked = free && id !== "standard";
                          return (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                if (locked) navigate({ to: "/pricing" });
                                else setTier(id);
                              }}
                              className={cn(
                                "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                                tier === id && !locked
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground",
                              )}
                            >
                              {label}
                              {locked && <Lock className="h-3 w-3" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </>
                )}

                {mode === "video" && (
                  <>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Duration
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {VIDEO_DURATIONS.map((d) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setVideoDuration(d)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                              videoDuration === d
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {d}s
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                        Aspect ratio
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {VIDEO_ASPECTS.map((a) => (
                          <button
                            key={a}
                            type="button"
                            onClick={() => setVideoAspect(a)}
                            className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-xs font-medium capitalize",
                              videoAspect === a
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border text-muted-foreground",
                            )}
                          >
                            {a === "auto" ? "Auto" : a}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {mode === "music" && (
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Type
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {(
                        [
                          ["song", "Song"],
                          ["instrumental", "Instrumental"],
                        ] as const
                      ).map(([id, label]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setMusicKind(id)}
                          className={cn(
                            "rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                            musicKind === id
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}

function ModeTab({
  active,
  onClick,
  icon,
  label,
  locked,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
      {locked ? <Lock className="h-3 w-3 opacity-60" /> : null}
    </button>
  );
}
