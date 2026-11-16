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
  Share2,
  Mic,
  Zap,
  Crown,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { type StudioTier, STUDIO_TIER_META } from "@/lib/studio/studio-tier";
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
        content: "Create images, video, and music with Motio2edit.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

type StudioMode = "image" | "video" | "music";

type AttachedItem = {
  id: string;
  file: File;
  preview: string;
};

type ConversationItem =
  | { id: string; role: "user"; text: string; previews?: string[] }
  | {
      id: string;
      role: "assistant";
      kind: "image";
      prompt: string;
      url: string;
      watermarked: boolean;
    };

const VIDEO_ASPECTS = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS = [5, 8, 10] as const;
const IMAGE_ASPECTS = ["1:1", "4:3", "16:9", "9:16", "3:4"] as const;
const MAX_FILE_MB = 12;
const MAX_ATTACH_FREE = 5;
const MAX_ATTACH_PAID = 10;

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
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [imageAspect, setImageAspect] = useState<string>("1:1");
  const [videoAspect, setVideoAspect] = useState<string>("16:9");
  const [videoDuration, setVideoDuration] = useState<number>(5);
  const [showVideoOpts, setShowVideoOpts] = useState(false);

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);

  /** Free may only run Standard + single-image effective generate */
  const multiBlocked = free && attached.length > 1;
  const tierBlocked = free && tier !== "standard";
  const needsUpgrade = modeLocked || multiBlocked || tierBlocked;

  const credits = profile?.credits ?? 0;
  const maxAttach = paid ? MAX_ATTACH_PAID : MAX_ATTACH_FREE;

  useInFlightStageAdvance(busy && mode === "image");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [items, busy, statusText]);

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
        ? "Describe the change you want…"
        : "Describe an image to create…"
      : mode === "video"
        ? "Describe a video scene…"
        : "Describe a song or instrumental…";

  const clearAllAttachments = useCallback(() => {
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
        id: `${Date.now()}-${i}-${file.name}`,
        file,
        preview: URL.createObjectURL(file),
      });
    }
    setAttached((prev) => {
      const merged = [...prev, ...next].slice(0, maxAttach);
      if (prev.length + next.length > maxAttach) {
        toast.message(`Up to ${maxAttach} images`);
      }
      return merged;
    });
    if (fileRef.current) fileRef.current.value = "";
  };

  const onAttachClick = () => {
    if (mode === "image") {
      fileRef.current?.click();
      return;
    }
    if (mode === "video") {
      if (!videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      navigate({ to: "/studio/video" });
      return;
    }
    if (!musicOk) {
      navigate({ to: "/pricing" });
      return;
    }
    navigate({ to: "/music" });
  };

  const selectTier = (t: StudioTier) => {
    if (free && t !== "standard") {
      navigate({ to: "/pricing" });
      return;
    }
    setTier(t);
  };

  const selectMode = (m: StudioMode) => {
    setMode(m);
    if (m !== "image") clearAllAttachments();
    if (m === "video") setShowVideoOpts(true);
  };

  const toggleMic = () => {
    const SR =
      typeof window !== "undefined"
        ? (window as unknown as {
            SpeechRecognition?: new () => {
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
            webkitSpeechRecognition?: new () => {
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
          }).SpeechRecognition ||
          (window as unknown as { webkitSpeechRecognition?: new () => unknown })
            .webkitSpeechRecognition
        : undefined;

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

  const onPrimaryClick = async () => {
    if (busy) return;
    if (needsUpgrade) {
      navigate({ to: "/pricing" });
      return;
    }
    const trimmed = prompt.trim();
    if (!trimmed && mode === "image" && attached.length === 0) {
      toast.error("Enter a prompt or attach an image.");
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
            aspectRatio: videoAspect,
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
      navigate({ to: "/music" });
      return;
    }

    if (!user) {
      navigate({ to: "/auth" });
      return;
    }

    setBusy(true);
    setLastError(null);
    setStatusText("Working…");
    startGeneration("image", "/studio");

    const userId = `${Date.now()}-u`;
    setItems((prev) => [
      ...prev,
      {
        id: userId,
        role: "user",
        text: trimmed || "(edit image)",
        previews: attached.map((a) => a.preview),
      },
    ]);

    try {
      let imageUrl: string | undefined;
      const primary = attached[0];
      if (primary) {
        setStatusText("Uploading…");
        setGenerationStage("PREPARING");
        imageUrl = await uploadToStorage(
          primary.file,
          profile?.id ?? user.id ?? "anon",
        );
        if (!imageUrl?.startsWith("https://")) {
          throw new Error("Upload failed. Try a smaller image.");
        }
      }

      setStatusText("Generating…");
      setGenerationStage("GENERATING");

      const res = (await generate({
        data: {
          type: "image",
          prompt: trimmed || "Enhance this image",
          imageUrl: imageUrl ?? null,
          aspectRatio: imageAspect,
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
      setItems((prev) => [
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
      clearAllAttachments();
      toast.success("Done");
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

  const empty = items.length === 0 && !busy;

  const shareResult = async (url: string) => {
    try {
      if (navigator.share) {
        await navigator.share({ url, title: "Motio2edit" });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-3 sm:px-4">
        {/* Credits only in top strip — mode lives in composer */}
        <div className="mb-2 flex justify-end">
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums"
          >
            <Coins className="h-3 w-3 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {empty && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                What do you want to create?
              </h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Image, video, or music — pick a mode in the bar below, then describe your idea.
              </p>
            </div>
          )}

          {items.map((it) =>
            it.role === "user" ? (
              <div key={it.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-primary/15 px-3 py-2 text-sm text-foreground">
                  {it.previews && it.previews.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {it.previews.map((p) => (
                        <img
                          key={p}
                          src={p}
                          alt=""
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}
                  <p>{it.text}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">Sent</p>
                </div>
              </div>
            ) : (
              <div key={it.id} className="flex justify-start">
                <div className="max-w-[92%] overflow-hidden rounded-2xl rounded-bl-md border border-border bg-card">
                  <div className="relative">
                    <img
                      src={it.url}
                      alt="Result"
                      className="max-h-[420px] w-full object-contain bg-muted/20"
                    />
                    {it.watermarked && (
                      <span className="absolute bottom-2 right-2 rounded-md bg-black/55 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                        Motio2edit · Free
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-1.5">
                    <a
                      href={it.url}
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
                      onClick={() => void shareResult(it.url)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium hover:bg-secondary"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                      Share
                    </button>
                    {it.watermarked ? (
                      <button
                        type="button"
                        onClick={() => navigate({ to: "/pricing" })}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-secondary"
                      >
                        <Lock className="h-3.5 w-3.5" />
                        Remove watermark
                      </button>
                    ) : (
                      <span className="px-2 text-[10px] text-muted-foreground">
                        No watermark
                      </span>
                    )}
                    <span className="ml-auto text-[10px] text-muted-foreground">
                      Received
                    </span>
                  </div>
                </div>
              </div>
            ),
          )}

          {lastError && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {lastError}
              {/credit|enough/i.test(lastError) && (
                <button
                  type="button"
                  className="ml-2 font-semibold underline"
                  onClick={() => navigate({ to: "/pricing" })}
                >
                  Get credits
                </button>
              )}
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
        <div className="sticky bottom-0 mt-auto bg-background pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Thumbnails only — no filenames */}
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
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-background text-muted-foreground shadow ring-1 ring-border"
                    aria-label="Remove"
                    disabled={busy}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {multiBlocked && (
                <p className="w-full text-[11px] text-muted-foreground">
                  Multiple images need a paid plan. You can still select them — upgrade to generate.
                </p>
              )}
            </div>
          )}

          <div
            className={cn(
              "rounded-2xl border border-border bg-card shadow-sm",
              "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10",
            )}
          >
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              rows={2}
              disabled={busy}
              className={cn(
                "w-full resize-none bg-transparent px-4 pt-3 text-[15px] leading-relaxed text-foreground",
                "placeholder:text-muted-foreground/60 focus:outline-none",
                "min-h-[3.25rem] max-h-[30vh]",
              )}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onPrimaryClick();
                }
              }}
              aria-label="Prompt"
            />

            {/* Tools row: attach · experience · mode · mic · generate */}
            <div className="flex flex-wrap items-center gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={onAttachClick}
                disabled={busy}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground",
                  attached.length > 0 && mode === "image" && "text-primary",
                )}
                title="Attach images"
                aria-label="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>

              {/* Experience — Standard free; Premium/Ultra lock → pricing */}
              <div className="flex items-center gap-0.5 rounded-full bg-muted/40 p-0.5">
                {(
                  [
                    { id: "standard" as const, icon: Zap, label: "Standard" },
                    { id: "pro" as const, icon: Crown, label: "Premium" },
                    { id: "premium" as const, icon: Sparkles, label: "Ultra AI" },
                  ] as const
                ).map(({ id, icon: Icon, label }) => {
                  const locked = free && id !== "standard";
                  const active = tier === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      title={locked ? "Upgrade for " + label : label}
                      onClick={() => selectTier(id)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition",
                        active && !locked && "bg-background text-foreground shadow-sm",
                        !active && "text-muted-foreground hover:text-foreground",
                        locked && "opacity-70",
                      )}
                    >
                      <Icon className="h-3 w-3" />
                      <span className="hidden sm:inline">{STUDIO_TIER_META[id].label}</span>
                      {locked && <Lock className="h-2.5 w-2.5" />}
                    </button>
                  );
                })}
              </div>

              {/* Mode selector in prompt bar */}
              <div className="flex items-center gap-0.5 rounded-full bg-muted/40 p-0.5">
                <ModeChip
                  active={mode === "image"}
                  onClick={() => selectMode("image")}
                  icon={<ImageIcon className="h-3 w-3" />}
                  label="Image"
                />
                <ModeChip
                  active={mode === "video"}
                  onClick={() => selectMode("video")}
                  icon={<Video className="h-3 w-3" />}
                  label="Video"
                  locked={!videoOk}
                  onLocked={() => navigate({ to: "/pricing" })}
                />
                <ModeChip
                  active={mode === "music"}
                  onClick={() => selectMode("music")}
                  icon={<Music className="h-3 w-3" />}
                  label="Music"
                  locked={!musicOk}
                  onLocked={() => navigate({ to: "/pricing" })}
                />
              </div>

              {mode === "video" && videoOk && (
                <button
                  type="button"
                  onClick={() => setShowVideoOpts((v) => !v)}
                  className="inline-flex items-center gap-0.5 rounded-full px-2 py-1 text-[11px] text-muted-foreground hover:bg-secondary"
                >
                  {videoAspect} · {videoDuration}s
                  <ChevronDown className="h-3 w-3" />
                </button>
              )}

              <div className="min-w-0 flex-1" />

              <button
                type="button"
                onClick={toggleMic}
                className={cn(
                  "relative inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground",
                  listening && "text-primary",
                )}
                title="Voice input"
                aria-label="Microphone"
              >
                {listening && (
                  <span className="absolute inset-0 animate-ping rounded-xl bg-primary/20" />
                )}
                <Mic className={cn("h-4 w-4", listening && "text-primary")} />
              </button>

              <Button
                size="sm"
                className="h-9 gap-1 rounded-full px-3.5"
                onClick={() => void onPrimaryClick()}
                disabled={busy}
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

            {mode === "video" && showVideoOpts && videoOk && (
              <div className="space-y-2 border-t border-border/60 px-3 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_ASPECTS.map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setVideoAspect(a)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[11px]",
                        videoAspect === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_DURATIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setVideoDuration(d)}
                      className={cn(
                        "rounded-lg border px-2 py-1 text-[11px]",
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
            )}

            {mode === "image" && (
              <div className="flex flex-wrap gap-1 border-t border-border/40 px-3 py-1.5">
                {IMAGE_ASPECTS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setImageAspect(a)}
                    className={cn(
                      "rounded-md px-1.5 py-0.5 text-[10px]",
                      imageAspect === a
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {a}
                  </button>
                ))}
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

function ModeChip({
  active,
  onClick,
  icon,
  label,
  locked,
  onLocked,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  locked?: boolean;
  onLocked?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        if (locked) {
          onLocked?.();
          return;
        }
        onClick();
      }}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-medium transition",
        active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground",
        locked && "opacity-70",
      )}
    >
      {icon}
      <span className="hidden xs:inline sm:inline">{label}</span>
      {locked ? <Lock className="h-2.5 w-2.5" /> : null}
    </button>
  );
}
