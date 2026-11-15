/**
 * Motio2edit Studio — Image | Video | Music on one page.
 * Prompt bar + upload + samples below (image carousel + video style thumbs).
 */
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { useServerFn } from "@tanstack/react-start";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  Sparkles,
  ArrowUpRight,
  Loader2,
  Upload,
  X,
  Send,
  Download,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";
import { generateMedia } from "@/lib/generate.functions";
import { generateMusic } from "@/lib/music.functions";
import { supabase } from "@/integrations/supabase/client";
import { startGeneration, endGeneration } from "@/lib/generation-status";
import { toast } from "sonner";
import { ImageStudioWeeklyCarousel } from "@/components/editor/image/ImageStudioWeeklyCarousel";
import { VideoStyleStrip } from "@/components/video/VideoStyleStrip";

const searchSchema = z.object({
  mode: z.enum(["image", "video", "music"]).optional().default("image"),
});

export type Motion2AIMode = "image" | "video" | "music";

export const Route = createFileRoute("/motion2ai")({
  validateSearch: (s) => {
    try {
      return searchSchema.parse(s);
    } catch {
      return { mode: "image" as const };
    }
  },
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit by Motion2AI" },
      {
        name: "description",
        content: "Create images, videos, and music in one studio.",
      },
    ],
  }),
  component: Motion2AIPage,
});

const MODE_META: {
  id: Motion2AIMode;
  label: string;
  icon: typeof ImageIcon;
  placeholder: string;
}[] = [
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    placeholder: "Describe the image you want to create…",
  },
  {
    id: "video",
    label: "Video",
    icon: Video,
    placeholder: "Describe the video scene, motion, and style…",
  },
  {
    id: "music",
    label: "Music",
    icon: Music,
    placeholder: "Describe the track — genre, mood, instruments…",
  },
];

type StudioResult = {
  id: string;
  mode: Motion2AIMode;
  prompt: string;
  url: string;
  kind: "image" | "video" | "audio";
  credits?: number | null;
};

async function uploadAttachment(file: File, userId: string) {
  const ext = file.name.split(".").pop() || "bin";
  const path = `${userId}/studio/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("uploads").upload(path, file, {
    contentType: file.type || "application/octet-stream",
    upsert: true,
  });
  if (error) throw new Error(error.message || "Upload failed");
  const { data } = await supabase.storage
    .from("uploads")
    .createSignedUrl(path, 60 * 60 * 24 * 7);
  if (!data?.signedUrl) throw new Error("Could not create file URL");
  return data.signedUrl;
}

function Motion2AIPage() {
  const { mode: searchMode } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { user, profile, loading, refreshProfile } = useAuth();
  const [mode, setMode] = useState<Motion2AIMode>(searchMode ?? "image");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<StudioResult[]>([]);
  const [videoStyle, setVideoStyle] = useState("none");
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const generate = useServerFn(generateMedia);
  const generateTrack = useServerFn(generateMusic);

  useEffect(() => {
    if (searchMode && searchMode !== mode) setMode(searchMode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMode]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results, busy]);

  const isAdmin = isAdminEmail(profile?.email);
  const planId = (profile?.plan ?? "free") as PlanId;
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const credits = profile?.credits ?? 0;
  const activeMeta = MODE_META.find((m) => m.id === mode) ?? MODE_META[0];

  const switchMode = useCallback(
    (next: Motion2AIMode) => {
      if (next === "video" && user && !videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      setMode(next);
      void navigate({
        search: (prev) => ({ ...prev, mode: next }),
        replace: true,
      });
    },
    [navigate, user, videoOk],
  );

  const clearFile = () => {
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    clearFile();
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const requireAuth = () => {
    navigate({
      to: "/auth",
      search: { redirect: `/motion2ai?mode=${mode}`, mode: "signin" },
    });
  };

  const onGenerate = async () => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Write a prompt first");
      return;
    }
    if (!user || !profile) {
      requireAuth();
      return;
    }
    if (mode === "video" && !videoOk) {
      navigate({ to: "/pricing" });
      return;
    }

    setBusy(true);
    startGeneration(mode === "music" ? "music" : mode, "/motion2ai");
    try {
      let imageUrl: string | undefined;
      if (file) {
        imageUrl = await uploadAttachment(file, user.id);
      }

      if (mode === "music") {
        const res = await generateTrack({
          data: {
            mode: "song",
            prompt: text,
            durationSeconds: 30,
            qualityTier: "standard",
            imageUrl,
            instrumental: false,
          },
        });
        if (!res?.outputUrl) throw new Error("No audio returned");
        setResults((prev) => [
          {
            id: crypto.randomUUID?.() ?? String(Date.now()),
            mode: "music",
            prompt: text,
            url: res.outputUrl,
            kind: "audio",
            credits: res.creditsCharged ?? null,
          },
          ...prev,
        ]);
        toast.success(res.creditsCharged ? `Ready · ${res.creditsCharged} credits` : "Track ready");
      } else {
        const res = await generate({
          data: {
            type: mode,
            prompt: text,
            imageUrl: imageUrl ?? null,
            studioTier: mode === "image" ? "standard" : null,
            videoMode: mode === "video" ? (imageUrl ? "image-to-video" : "text-to-video") : null,
            videoDuration: mode === "video" ? 5 : null,
            videoResolution: mode === "video" ? "720p" : null,
            videoAspect: mode === "video" ? "16:9" : null,
            videoStyle: mode === "video" && videoStyle !== "none" ? videoStyle : null,
          },
        });
        const url =
          (res as { url?: string; outputUrl?: string; videoUrl?: string })?.url ||
          (res as { outputUrl?: string })?.outputUrl ||
          (res as { videoUrl?: string })?.videoUrl;
        if (!url) throw new Error("No media returned");
        setResults((prev) => [
          {
            id: crypto.randomUUID?.() ?? String(Date.now()),
            mode,
            prompt: text,
            url,
            kind: mode === "video" ? "video" : "image",
            credits: (res as { creditsCharged?: number })?.creditsCharged ?? null,
          },
          ...prev,
        ]);
        toast.success("Ready");
      }
      void refreshProfile?.();
      setPrompt("");
      clearFile();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
      endGeneration();
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-20 top-40 h-80 w-80 rounded-full bg-orange-400/10 blur-3xl" />
        <div className="absolute bottom-20 left-1/3 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/75 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="min-w-0">
            <p className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
              Motio2edit.com
            </p>
            <p className="text-[11px] font-medium text-muted-foreground">
              By <span className="font-semibold text-primary">Motion2AI</span>
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            {user && profile ? (
              <>
                <div className="flex items-center gap-1 rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-xs font-semibold">
                  <Coins className="h-3.5 w-3.5 text-amber-500" />
                  <span className="tabular-nums">{credits.toLocaleString()}</span>
                </div>
                <Button
                  size="sm"
                  className="h-8 gap-1 rounded-full px-3 text-xs font-bold"
                  onClick={() => navigate({ to: "/pricing" })}
                >
                  Upgrade
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </>
            ) : (
              <Button size="sm" className="h-8 rounded-full px-3 text-xs font-bold" onClick={requireAuth}>
                Sign in
              </Button>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-3xl px-4 pb-3">
          <div
            className="flex gap-1 rounded-2xl border border-border/60 bg-card/60 p-1 shadow-sm backdrop-blur-md"
            role="tablist"
            aria-label="Studio modes"
          >
            {MODE_META.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              const locked = m.id === "video" && !!user && !videoOk;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchMode(m.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-bold transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                    locked && "opacity-55",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* Feed — extra bottom padding for prompt + samples dock */}
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 pb-[min(52vh,28rem)] pt-4">
        {!user && (
          <div className="mb-4 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 text-center text-sm text-muted-foreground backdrop-blur-md">
            Explore samples freely.{" "}
            <button type="button" className="font-semibold text-primary hover:underline" onClick={requireAuth}>
              Sign in
            </button>{" "}
            to generate.
          </div>
        )}

        {results.length === 0 && !busy && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Sparkles className="h-7 w-7" />
            </span>
            <h1 className="mt-4 text-xl font-extrabold tracking-tight">What will you create today?</h1>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Image, Video, or Music — prompt below, samples underneath.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {results.map((r) => (
            <article
              key={r.id}
              className="overflow-hidden rounded-2xl border border-border/60 bg-card/80 shadow-sm backdrop-blur-md"
            >
              <div className="border-b border-border/40 px-4 py-2 text-xs text-muted-foreground">
                <span className="font-semibold capitalize text-foreground">{r.mode}</span>
                {" · "}
                <span className="line-clamp-1">{r.prompt}</span>
              </div>
              {r.kind === "image" && (
                <img src={r.url} alt="" className="max-h-[70vh] w-full object-contain bg-black/5" />
              )}
              {r.kind === "video" && (
                <video src={r.url} controls playsInline className="aspect-video w-full bg-black" />
              )}
              {r.kind === "audio" && (
                <div className="p-4">
                  <audio src={r.url} controls className="w-full" />
                </div>
              )}
              <div className="flex items-center justify-between gap-2 px-4 py-2">
                {r.credits != null && (
                  <span className="text-[11px] text-muted-foreground">{r.credits} credits</span>
                )}
                <Button size="sm" variant="outline" className="ml-auto h-8 gap-1 rounded-full text-xs" asChild>
                  <a href={r.url} download target="_blank" rel="noreferrer">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </a>
                </Button>
              </div>
            </article>
          ))}
          {busy && (
            <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 px-4 py-4 text-sm">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              Generating {mode}…
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </main>

      {/* Prompt bar + samples BELOW it */}
      <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/50 bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-3xl px-3 sm:px-4">
          {preview && (
            <div className="mb-2 flex items-center gap-2">
              <div className="relative h-14 w-14 overflow-hidden rounded-xl border border-border">
                {file?.type.startsWith("video/") ? (
                  <video src={preview} className="h-full w-full object-cover" muted />
                ) : (
                  <img src={preview} alt="" className="h-full w-full object-cover" />
                )}
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute -right-1 -top-1 rounded-full bg-background p-0.5 shadow ring-1 ring-border"
                  aria-label="Remove attachment"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="truncate text-xs text-muted-foreground">{file?.name}</span>
            </div>
          )}

          <div className="flex items-end gap-2 rounded-2xl border border-border/70 bg-card/90 p-2 shadow-lg ring-1 ring-black/5 dark:ring-white/5">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted hover:text-foreground"
              aria-label="Upload"
              title="Upload reference"
            >
              <Upload className="h-5 w-5" />
            </button>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept={
                mode === "music"
                  ? "image/*,video/*"
                  : mode === "video"
                    ? "image/*,video/*"
                    : "image/*"
              }
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void onGenerate();
                }
              }}
              placeholder={activeMeta.placeholder}
              rows={1}
              className="max-h-32 min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
            />

            <Button
              type="button"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-xl"
              disabled={busy || !prompt.trim()}
              onClick={() => void onGenerate()}
              aria-label="Generate"
            >
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>

          {/* Samples BELOW prompt bar */}
          <div className="mt-2 max-h-[28vh] overflow-y-auto overscroll-contain">
            {mode === "image" && (
              <div className="rounded-xl border border-border/40 bg-card/40 px-1 py-1">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Sample edits
                </p>
                <ImageStudioWeeklyCarousel />
              </div>
            )}

            {mode === "video" && (
              <div className="rounded-xl border border-border/40 bg-card/40 px-2 py-2">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Video styles
                </p>
                <VideoStyleStrip
                  selectedId={videoStyle}
                  onSelect={setVideoStyle}
                  plan={profile?.plan}
                  isAdmin={isAdmin}
                  disabled={busy}
                />
              </div>
            )}

            {mode === "music" && (
              <p className="px-1 py-2 text-center text-[11px] text-muted-foreground">
                Song · instrumental · mood from your prompt. Upload optional image or video reference.
              </p>
            )}
          </div>

          <p className="mt-1 text-center text-[10px] text-muted-foreground">
            AI Tools →{" "}
            <Link to="/studio" className="font-semibold text-primary hover:underline">
              Circle, Frames, Filters
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
