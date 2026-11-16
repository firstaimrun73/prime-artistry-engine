/**
 * Unified Studio — Image | Video | Music
 * BUILD_MARKER: 2026-11-17-studio-v5
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { Header } from "@/components/Header";
import {
  Image as ImageIcon,
  Video,
  Music,
  Coins,
  ArrowUp,
  Paperclip,
  Lock,
  Settings2,
  Wand2,
  Clock,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic, isPaidPlan } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { getPlanLimits } from "@/utils/planLimits";
import type { StudioTier } from "@/lib/studio/studio-tier";
import {
  inferAspectFromPrompt,
  resolveVideoDuration,
  autoImageQuality,
  upgradePathForTier,
} from "@/lib/studio/auto-settings";
import { supabase } from "@/integrations/supabase/client";
import { isVisibleInHistory } from "@/lib/history-retention";

function StudioPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioWorkspace />;
}

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Create images, video, and music with Motio2edit Studio.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioPage,
});

type StudioMode = "image" | "video" | "music";
type SettingsMode = "auto" | "manual";

const IMAGE_ASPECTS = ["1:1", "4:3", "3:4", "16:9", "9:16"] as const;
const VIDEO_ASPECTS = ["16:9", "9:16", "1:1"] as const;
const VIDEO_DURATIONS = [5, 10, 15] as const;

type RecentItem = {
  id: string;
  type: string | null;
  prompt: string | null;
  output_url: string | null;
  status: string | null;
  created_at: string | null;
};

function StudioWorkspace() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const limits = getPlanLimits(plan ?? "free");
  const videoOk =
    admin || canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk =
    admin || canAccessMusic({ plan, email: profile?.email, isAdmin: admin });
  const credits = profile?.credits ?? 0;

  const tierOk = useMemo(
    () => ({
      standard: true,
      pro: admin || limits.premiumUnlocked,
      premium: admin || limits.ultraUnlocked,
    }),
    [admin, limits.premiumUnlocked, limits.ultraUnlocked],
  );

  const [mode, setMode] = useState<StudioMode>("image");
  const [prompt, setPrompt] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [settingsMode, setSettingsMode] = useState<SettingsMode>("auto");
  const [tier, setTier] = useState<StudioTier>("standard");
  const [aspect, setAspect] = useState("1:1");
  const [duration, setDuration] = useState(5);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);

  useEffect(() => {
    if (tier === "premium" && !tierOk.premium) {
      setTier(tierOk.pro ? "pro" : "standard");
    } else if (tier === "pro" && !tierOk.pro) {
      setTier("standard");
    }
  }, [tier, tierOk.premium, tierOk.pro]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    setRecentLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("generations")
          .select(
            "id, type, prompt, output_url, status, created_at, retained_as_history, deleted_at, expires_at",
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(12);
        if (cancelled) return;
        if (error) {
          console.warn("[studio] history:", error.message);
          setRecent([]);
        } else {
          const rows = (data || []).filter((g) => isVisibleInHistory(g as never));
          setRecent(rows as RecentItem[]);
        }
      } finally {
        if (!cancelled) setRecentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const autoSummary = useMemo(() => {
    if (settingsMode !== "auto") return null;
    if (mode === "image") {
      const a = inferAspectFromPrompt(prompt, "image") || aspect;
      const q = autoImageQuality(prompt, tier);
      return `Auto · ${a} · ${q.quality.toUpperCase()}`;
    }
    if (mode === "video") {
      const d = resolveVideoDuration(prompt, tier);
      const a = inferAspectFromPrompt(prompt, "video") || "16:9";
      return `Auto · ${a} · ${d.selectedSec}s`;
    }
    return "Auto · plan defaults";
  }, [settingsMode, mode, prompt, aspect, tier]);

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (mode === "image" && !file.type.startsWith("image/")) return;
    if (
      mode === "video" &&
      !file.type.startsWith("image/") &&
      !file.type.startsWith("video/")
    ) {
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setPreview(URL.createObjectURL(file));
  };

  const onAttach = () => {
    if (mode === "video" && !videoOk) {
      navigate({ to: "/pricing" });
      return;
    }
    if (mode === "music" && !musicOk) {
      navigate({ to: "/pricing" });
      return;
    }
    fileInputRef.current?.click();
  };

  const persistPreset = (payload: Record<string, unknown>) => {
    try {
      sessionStorage.setItem("motio2edit-preset", JSON.stringify(payload));
    } catch {
      /* private mode */
    }
  };

  const onGenerate = () => {
    const trimmed = prompt.trim();

    if (mode === "video") {
      if (!videoOk) {
        navigate({ to: "/pricing" });
        return;
      }
      const d =
        settingsMode === "auto"
          ? resolveVideoDuration(trimmed, tier)
          : { selectedSec: duration };
      const a =
        settingsMode === "auto"
          ? inferAspectFromPrompt(trimmed, "video") || aspect
          : aspect;
      persistPreset({
        prompt: trimmed,
        mode: "video",
        tier,
        aspect: a,
        duration: d.selectedSec,
        settingsMode,
      });
      navigate({ to: "/studio/video" });
      return;
    }

    if (mode === "music") {
      if (!musicOk) {
        navigate({ to: "/pricing" });
        return;
      }
      persistPreset({
        prompt: trimmed,
        mode: "music",
        tier,
        settingsMode,
      });
      navigate({ to: "/music" });
      return;
    }

    const a =
      settingsMode === "auto"
        ? inferAspectFromPrompt(trimmed, "image") || aspect
        : aspect;
    const q = autoImageQuality(trimmed, tier);
    persistPreset({
      prompt: trimmed,
      mode: "image",
      tier,
      aspect: a,
      quality: settingsMode === "auto" ? q.quality : undefined,
      settingsMode,
    });
    if (trimmed) {
      navigate({
        to: "/editor",
        search: { prompt: trimmed } as never,
      });
    } else {
      navigate({ to: "/editor" });
    }
  };

  const modes = [
    { id: "image" as const, icon: ImageIcon, label: "Image", ok: true },
    { id: "video" as const, icon: Video, label: "Video", ok: videoOk },
    { id: "music" as const, icon: Music, label: "Music", ok: musicOk },
  ];

  const tiers: { id: StudioTier; label: string; ok: boolean }[] = [
    { id: "standard", label: "Standard", ok: true },
    { id: "pro", label: "Premium", ok: tierOk.pro },
    { id: "premium", label: "Ultra AI", ok: tierOk.premium },
  ];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pt-5">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Motio2edit
            </p>
            <h1 className="text-xl font-semibold tracking-tight">Studio</h1>
          </div>
          <button
            type="button"
            onClick={() => navigate({ to: "/profile" })}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs font-semibold tabular-nums shadow-sm"
            title="Credits · open Profile"
          >
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            {credits.toLocaleString()}
          </button>
        </div>

        <div className="mb-3 flex items-center gap-1 rounded-2xl border border-border/80 bg-muted/25 p-1">
          {modes.map(({ id, icon: Icon, label, ok }) => {
            const active = mode === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  if (!ok) {
                    navigate({ to: "/pricing" });
                    return;
                  }
                  setMode(id);
                  if (preview) {
                    URL.revokeObjectURL(preview);
                    setPreview(null);
                  }
                  if (id === "video") setAspect("16:9");
                  if (id === "image") setAspect("1:1");
                }}
                className={cn(
                  "relative flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition sm:text-sm",
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                  !ok && "opacity-55",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {!ok ? <Lock className="h-3 w-3 opacity-70" /> : null}
              </button>
            );
          })}
        </div>

        {(mode === "video" && !videoOk) || (mode === "music" && !musicOk) ? (
          <div className="mb-3 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-sm">
            <p className="font-medium text-foreground">
              {mode === "video" ? "Video" : "Music"} needs a paid plan
            </p>
            <button
              type="button"
              className="mt-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => navigate({ to: "/pricing" })}
            >
              View upgrade plans →
            </button>
          </div>
        ) : null}

        {mode !== "music" ? (
          <div className="mb-3">
            <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
              Experience
            </p>
            <div className="flex gap-1.5">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    if (!t.ok) {
                      navigate({ to: upgradePathForTier(t.id) });
                      return;
                    }
                    setTier(t.id);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1 rounded-xl border px-2 py-2 text-[11px] font-semibold transition sm:text-xs",
                    tier === t.id && t.ok
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                    !t.ok && "opacity-60",
                  )}
                >
                  {t.label}
                  {!t.ok ? <Lock className="h-3 w-3" /> : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mb-3 flex gap-1 rounded-xl border border-border/70 bg-card/50 p-1">
          <button
            type="button"
            onClick={() => setSettingsMode("auto")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
              settingsMode === "auto"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Wand2 className="h-3.5 w-3.5" />
            Auto
          </button>
          <button
            type="button"
            onClick={() => setSettingsMode("manual")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold transition",
              settingsMode === "manual"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground",
            )}
          >
            <Settings2 className="h-3.5 w-3.5" />
            Composer
          </button>
        </div>

        {settingsMode === "auto" ? (
          <p className="mb-3 text-xs text-muted-foreground">
            {autoSummary
              ? `${autoSummary} — inferred from your prompt`
              : "Auto picks aspect, quality and duration from your prompt."}
          </p>
        ) : (
          <div className="mb-3 space-y-2.5 rounded-xl border border-border/70 bg-card/40 p-3">
            {(mode === "image" || mode === "video") && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Aspect ratio
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(mode === "image" ? IMAGE_ASPECTS : VIDEO_ASPECTS).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => setAspect(a)}
                      className={cn(
                        "rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                        aspect === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {mode === "video" && (
              <div>
                <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  Duration
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VIDEO_DURATIONS.map((d) => {
                    const locked = d === 15 && tier === "standard";
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (locked) {
                            navigate({ to: "/pricing" });
                            return;
                          }
                          setDuration(d);
                        }}
                        className={cn(
                          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold",
                          duration === d && !locked
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground",
                          locked && "opacity-55",
                        )}
                      >
                        {d}s
                        {locked ? <Lock className="h-3 w-3" /> : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {mode === "music" && (
              <p className="text-xs text-muted-foreground">
                Full music controls open in Music Studio after Generate.
              </p>
            )}
          </div>
        )}

        <div className="mb-3 flex-1">
          <p className="text-sm text-muted-foreground">
            {mode === "image"
              ? "Type a prompt or attach a photo to edit."
              : mode === "video"
                ? "Describe the scene, camera and motion."
                : "Describe mood, genre, instruments or vocals."}
          </p>
          {preview ? (
            <img
              src={preview}
              alt="Attachment preview"
              className="mt-3 h-24 w-24 rounded-xl object-cover ring-1 ring-border"
            />
          ) : null}
        </div>

        <div className="mt-auto">
          <div className="rounded-2xl border border-border bg-card/90 p-2 shadow-lg backdrop-blur-xl">
            <div className="flex items-end gap-1.5">
              <button
                type="button"
                onClick={onAttach}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                aria-label="Attach file"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
                placeholder={
                  mode === "image"
                    ? "Describe what you want to create…"
                    : mode === "video"
                      ? "Describe a video scene…"
                      : "Describe a song or instrumental…"
                }
                rows={2}
                className="min-h-[44px] flex-1 resize-none bg-transparent px-1 py-2.5 text-sm outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={onGenerate}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow transition hover:opacity-90"
                aria-label="Generate"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-muted-foreground/80">
            Credits apply on generate · {settingsMode === "auto" ? "Auto" : "Composer"} mode
          </p>
        </div>

        <section className="mt-6 border-t border-border/60 pt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Recent
            </h2>
            <Link
              to="/profile"
              className="text-xs font-medium text-primary hover:underline"
            >
              Account
            </Link>
          </div>
          {recentLoading ? (
            <p className="text-xs text-muted-foreground">Loading…</p>
          ) : recent.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
              Your recent generations will show up here.
            </p>
          ) : (
            <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {recent.map((g) => (
                <li
                  key={g.id}
                  className="overflow-hidden rounded-xl border border-border bg-card"
                >
                  {g.output_url && g.type !== "music" ? (
                    <img
                      src={g.output_url}
                      alt=""
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted/40 text-[10px] text-muted-foreground">
                      {(g.type || "item").slice(0, 8)}
                    </div>
                  )}
                  <p className="truncate px-1.5 py-1 text-[10px] text-muted-foreground">
                    {g.prompt || g.status || "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <input
          ref={fileInputRef}
          type="file"
          accept={mode === "image" ? "image/*" : "image/*,video/*"}
          className="hidden"
          aria-hidden
          onChange={onFileChange}
        />
      </main>
    </div>
  );
}
