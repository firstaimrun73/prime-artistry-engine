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
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  maxPromptCharsForPlan,
  isPromptEffectivelyUnlimited,
} from "@/utils/planLimits";
import { getMusicPlanCapabilities } from "@/lib/music/music-plan-capabilities";
import {
  STANDARD_VIDEO_PROMPT_MAX,
  PREMIUM_VIDEO_PROMPT_MAX,
} from "@/components/video/VideoPromptBar";
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

type ConversationResult = {
  id: string;
  kind: "image";
  prompt: string;
  url: string;
};

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

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const paid = admin || isPaidPlan(plan);
  // Admin always unlocked; free users follow existing product policy
  const videoOk =
    admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk =
    admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const musicCaps = useMemo(() => getMusicPlanCapabilities(plan), [plan]);

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
  const [attachedName, setAttachedName] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [statusText, setStatusText] = useState<string | null>(null);
  const [results, setResults] = useState<ConversationResult[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);

  const modeLocked =
    (mode === "video" && !videoOk) || (mode === "music" && !musicOk);

  const credits = profile?.credits ?? 0;

  useInFlightStageAdvance(busy && mode === "image");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results, busy, statusText]);

  const promptMax = useMemo(() => {
    if (mode === "image") {
      if (isPromptEffectivelyUnlimited(plan)) return null;
      return maxPromptCharsForPlan(plan, admin);
    }
    if (mode === "video") {
      return paid ? PREMIUM_VIDEO_PROMPT_MAX : STANDARD_VIDEO_PROMPT_MAX;
    }
    return musicCaps.promptMaxChars > 0 ? musicCaps.promptMaxChars : 500;
  }, [mode, plan, admin, paid, musicCaps.promptMaxChars]);

  const placeholder =
    mode === "image"
      ? attachedPreview
        ? "Describe the change you want…"
        : "Describe an image to create…"
      : mode === "video"
        ? "Describe a video scene…"
        : "Describe a song or instrumental…";

  const overLimit = promptMax != null && prompt.length > promptMax;

  const onPromptChange = (value: string) => {
    if (promptMax != null && value.length > promptMax) {
      setPrompt(value.slice(0, promptMax));
      return;
    }
    setPrompt(value);
  };

  const clearAttachment = useCallback(() => {
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAttachedName(null);
    setAttachedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }, []);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      toast.error("Image must be under 25MB.");
      return;
    }
    setAttachedPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setAttachedName(file.name);
    setAttachedFile(file);
  };

  const onAttachClick = () => {
    if (mode === "image") {
      fileRef.current?.click();
      return;
    }
    // Video / music use their full studios for media pick for now
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

  const onGenerate = async () => {
    if (busy) return;
    if (modeLocked) {
      navigate({ to: "/pricing" });
      return;
    }
    if (overLimit) return;
    const trimmed = prompt.trim();
    if (!trimmed && mode === "image" && !attachedFile) {
      toast.error("Enter a prompt or attach an image.");
      return;
    }

    if (mode === "video") {
      try {
        sessionStorage.setItem(
          "motio2edit-preset",
          JSON.stringify({ prompt: trimmed || undefined, mode: "video" }),
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

    try {
      let imageUrl: string | undefined;
      if (attachedFile) {
        setStatusText("Uploading…");
        setGenerationStage("PREPARING");
        imageUrl = await uploadToStorage(
          attachedFile,
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
          aspectRatio: "1:1",
          studioTier: "standard",
          imageQuality: "sd",
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
      setResults((prev) => [
        {
          id: `${Date.now()}`,
          kind: "image",
          prompt: trimmed || "(edit)",
          url: outputUrl,
        },
        ...prev,
      ]);
      setStatusText(null);
      setPrompt("");
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

  const empty = results.length === 0 && !busy;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-4 pt-3 sm:px-4">
        {/* Mode row */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div
            className="inline-flex rounded-full bg-muted/50 p-0.5"
            role="tablist"
            aria-label="Mode"
          >
            <ModePill
              active={mode === "image"}
              onClick={() => setMode("image")}
              icon={<ImageIcon className="h-3.5 w-3.5" />}
              label="Image"
            />
            <ModePill
              active={mode === "video"}
              onClick={() => setMode("video")}
              icon={<Video className="h-3.5 w-3.5" />}
              label="Video"
            />
            <ModePill
              active={mode === "music"}
              onClick={() => setMode("music")}
              icon={<Music className="h-3.5 w-3.5" />}
              label="Music"
            />
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/dashboard" })}
            className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs font-semibold tabular-nums"
          >
            <Coins className="h-3 w-3 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        {/* Conversation / empty */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
          {empty && (
            <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
              <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                What do you want to create?
              </h1>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                Type a prompt below. Attach a photo to edit. Video and music open their full tools when you generate.
              </p>
            </div>
          )}

          {results.map((r) => (
            <div key={r.id} className="space-y-2">
              <p className="text-sm text-muted-foreground">{r.prompt}</p>
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <img
                  src={r.url}
                  alt="Result"
                  className="max-h-[480px] w-full object-contain bg-muted/20"
                />
                <div className="flex gap-2 border-t border-border px-3 py-2">
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium hover:bg-secondary"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}

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

        {/* Composer — fixed feel at bottom of main */}
        <div className="sticky bottom-0 mt-auto border-t border-border/60 bg-background pt-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {attachedPreview && mode === "image" && (
            <div className="mb-2 flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
              <img
                src={attachedPreview}
                alt=""
                className="h-10 w-10 rounded-lg object-cover"
              />
              <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                {attachedName}
              </span>
              <button
                type="button"
                onClick={clearAttachment}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                aria-label="Remove"
                disabled={busy}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {modeLocked && (
            <p className="mb-2 text-center text-xs text-muted-foreground">
              {mode === "video" ? "Video" : "Music"} needs a paid plan.{" "}
              <button
                type="button"
                className="font-medium text-primary underline-offset-2 hover:underline"
                onClick={() => navigate({ to: "/pricing" })}
              >
                Upgrade
              </button>
            </p>
          )}

          <div
            className={cn(
              "rounded-2xl border border-border bg-card shadow-sm",
              "focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10",
            )}
          >
            <textarea
              value={prompt}
              onChange={(e) => onPromptChange(e.target.value)}
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
                  void onGenerate();
                }
              }}
              aria-label="Prompt"
            />
            <div className="flex items-center gap-1 px-2 pb-2">
              <button
                type="button"
                onClick={onAttachClick}
                disabled={busy}
                className={cn(
                  "inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground",
                  attachedPreview && mode === "image" && "text-primary",
                )}
                title={mode === "image" ? "Attach image" : "Open studio"}
                aria-label="Attach"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <div className="min-w-0 flex-1" />
              {promptMax != null && (
                <span
                  className={cn(
                    "mr-1 text-[10px] tabular-nums text-muted-foreground",
                    overLimit && "text-destructive",
                  )}
                >
                  {prompt.length}/{promptMax}
                </span>
              )}
              <Button
                size="sm"
                className="h-9 gap-1 rounded-full px-3.5"
                onClick={() => void onGenerate()}
                disabled={overLimit || busy}
              >
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Generate
                    <ArrowUp className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}

function ModePill({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
