import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InContentAd } from "@/components/ads";
import { MusicHistoryList } from "@/components/MusicHistoryList";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CREDIT_COST } from "@/lib/plans";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { secureDownloadImage } from "@/lib/download.functions";
import { useI18n } from "@/lib/i18n";
import {
  Download, Pencil, Trash2, ZoomIn, ZoomOut, Image as ImageIcon,
  Video, History as HistoryIcon, FolderOpen, Music, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type GenerationMeta = {
  experience?: string;
  source?: string;
  quality?: string;
  [key: string]: unknown;
};

type Generation = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
  metadata?: GenerationMeta | null;
};

/** Detect Auto Edit without changing other experience identities. */
function isAutoEditGeneration(g: Generation): boolean {
  const m = g.metadata;
  if (m?.experience === "auto-edit") return true;
  if (m?.source === "standalone_auto") return true;
  const p = (g.prompt ?? "").toLowerCase();
  return p.includes("maluto ai") || p.includes("motio2edit-auto");
}

function HistoryPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const secureDownload = useServerFn(secureDownloadImage);
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<Generation | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [tab, setTab] = useState<"media" | "music">("media");

  const load = () => {
    if (!user) {
      setLoading(false);
      setGens([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
    // RLS scopes rows to auth.uid(); explicit user_id keeps the filter clear.
    // If metadata is missing on older DBs, fall back without it.
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, status, created_at, metadata")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100)
      .then(async ({ data, error }) => {
        if (error) {
          console.error("[history] load failed:", error.message, error.code, error.details);
          const fb = await supabase
            .from("generations")
            .select("id, type, prompt, output_url, status, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);
          if (fb.error) {
            console.error("[history] fallback load failed:", fb.error.message);
            setGens([]);
            setLoadError(fb.error.message);
            toast.error("Could not load history.");
          } else {
            setGens((fb.data as Generation[]) ?? []);
            setLoadError(null);
          }
        } else {
          // Successful query: data may be [] — empty history is NOT an error.
          setGens((data as Generation[]) ?? []);
          setLoadError(null);
        }
        setLoading(false);
      });
  };

  useEffect(load, [user]);

  const open = (g: Generation) => {
    setActive(g);
    setZoomed(false);
  };

  const download = async (g: Generation) => {
    if (!g.output_url) return;
    try {
      let href = g.output_url;
      if (g.type === "image") {
        const res = await secureDownload({
          data: {
            imageUrl: g.output_url,
            keepWatermark: false,
          },
        });
        href = res.downloadUrl;
      }
      const res = await fetch(href);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `motio2edit-${g.id}.${g.type === "video" ? "mp4" : "jpg"}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("⬇️ Download started!");
    } catch (e) {
      console.error("[history] download failed:", e);
      toast.error("Download failed. Please try again.");
    }
  };

  const editAgain = (g: Generation) => {
    if (!g.output_url) return;
    if (isAutoEditGeneration(g)) {
      navigate({ to: "/studio/image/auto-edit" });
      return;
    }
    sessionStorage.setItem(
      "motio2edit-reuse",
      JSON.stringify({ url: g.output_url, kind: g.type === "video" ? "video" : "image" }),
    );
    navigate({ to: "/editor" });
  };

  const remove = async (g: Generation) => {
    const { error } = await supabase.from("generations").delete().eq("id", g.id);
    if (error) {
      toast.error("Could not delete this item.");
      return;
    }
    setGens((prev) => prev.filter((x) => x.id !== g.id));
    if (active?.id === g.id) setActive(null);
    toast.success("Deleted.");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 pb-24 md:pb-12">
      <div className="flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">{t("history.title")}</h1>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("history.lead")}</p>

      <InContentAd placement="history" />

      <div className="mt-6 flex flex-wrap gap-2">
        {(["media", "music"] as const).map((tabId) => (
          <button
            key={tabId}
            type="button"
            onClick={() => setTab(tabId)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === tabId
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {tabId === "media" ? t("history.media") : t("history.music")}
          </button>
        ))}
      </div>

      {tab === "music" ? (
        <MusicHistoryList userId={user?.id} />
      ) : loading ? (
        <p className="mt-8 text-sm text-muted-foreground">{t("common.loading")}</p>
      ) : loadError ? (
        <div className="mt-8 rounded-xl border border-destructive/40 bg-destructive/5 p-10 text-center">
          <p className="text-sm font-medium text-foreground">Could not load history</p>
          <p className="mt-1 text-sm text-muted-foreground">Please refresh and try again.</p>
          <Button size="sm" className="mt-4" variant="outline" onClick={load}>
            Retry
          </Button>
        </div>
      ) : gens.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <FolderOpen className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium text-foreground">{t("history.emptyTitle")}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t("history.empty")}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" onClick={() => navigate({ to: "/editor" })}>
              {t("studio.openEditor")}
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/studio/video">{t("home.createVideo")}</Link>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link to="/music">{t("home.createMusic")}</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {gens.map((g) => {
            const auto = isAutoEditGeneration(g);
            const isVideo = !auto && g.type === "video";
            const isImage = !auto && g.type === "image";
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => open(g)}
                className={cn(
                  "group overflow-hidden rounded-xl border bg-card text-left transition-colors",
                  auto
                    ? "border-violet-300/70 hover:border-violet-500 dark:border-violet-500/40"
                    : isVideo
                      ? "border-rose-300/70 hover:border-rose-500 dark:border-rose-500/40"
                      : isImage
                        ? "border-orange-300/60 hover:border-primary dark:border-orange-500/35"
                        : "border-border hover:border-primary",
                )}
              >
                <div
                  className={cn(
                    "relative aspect-square w-full",
                    auto
                      ? "bg-violet-500/10"
                      : isVideo
                        ? "bg-rose-500/10"
                        : isImage
                          ? "bg-orange-500/10"
                          : "bg-secondary",
                  )}
                >
                  {g.output_url ? (
                    g.type === "video" ? (
                      <video src={g.output_url} className="h-full w-full object-cover" muted playsInline />
                    ) : g.type === "music" ? (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-500/25 to-purple-500/5">
                        <Music className="h-8 w-8 text-primary" />
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          Audio
                        </span>
                      </div>
                    ) : (
                      <img
                        src={g.output_url}
                        alt={g.prompt ?? "Generated"}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = "0.3";
                        }}
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute left-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize backdrop-blur",
                      auto
                        ? "bg-gradient-to-r from-violet-600 to-cyan-500 text-white"
                        : isVideo
                          ? "bg-rose-600/90 text-white"
                          : isImage
                            ? "bg-primary/90 text-primary-foreground"
                            : "bg-background/80",
                    )}
                  >
                    {auto ? (
                      <Sparkles className="h-3 w-3" />
                    ) : g.type === "video" ? (
                      <Video className="h-3 w-3" />
                    ) : g.type === "music" ? (
                      <Music className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    {auto ? "Auto Edit" : g.type}
                  </span>
                </div>
                <div
                  className={cn(
                    "p-3",
                    auto && "bg-violet-500/5",
                    isVideo && "bg-rose-500/5",
                    isImage && "bg-orange-500/5",
                  )}
                >
                  <p className="truncate text-xs font-medium">
                    {auto ? "Maluto AI Auto Edit" : g.prompt ?? t("history.untitled")}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <>
              <DialogTitle className="capitalize">
                {isAutoEditGeneration(active) ? "Auto Edit preview" : `${active.type} preview`}
              </DialogTitle>
              <DialogDescription className="line-clamp-2">
                {isAutoEditGeneration(active)
                  ? "Maluto AI Auto Edit"
                  : active.prompt ?? "No prompt"}
              </DialogDescription>
              <div className="mt-2 flex max-h-[70vh] items-center justify-center overflow-auto rounded-lg border border-border bg-secondary/40 p-2">
                {active.output_url ? (
                  active.type === "video" ? (
                    <video src={active.output_url} className="max-h-[60vh] w-full" controls autoPlay />
                  ) : active.type === "music" ? (
                    <div className="flex w-full flex-col items-center gap-4 p-8">
                      <div className="rounded-full border border-border bg-background/60 p-4">
                        <Music className="h-8 w-8 text-primary" />
                      </div>
                      <audio src={active.output_url} controls autoPlay className="w-full max-w-md" />
                    </div>
                  ) : (
                    <img
                      src={active.output_url}
                      alt={active.prompt ?? "Generated"}
                      onClick={() => setZoomed((z) => !z)}
                      className={cn(
                        "cursor-zoom-in object-contain transition-transform duration-200",
                        zoomed ? "scale-[2] cursor-zoom-out" : "max-h-[65vh] w-auto max-w-full",
                      )}
                    />
                  )
                ) : (
                  <p className="p-10 text-sm text-muted-foreground">No output available.</p>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {active.type === "image" && active.output_url && (
                  <Button variant="outline" size="sm" onClick={() => setZoomed((z) => !z)}>
                    {zoomed ? <ZoomOut className="mr-1.5 h-4 w-4" /> : <ZoomIn className="mr-1.5 h-4 w-4" />}
                    {zoomed ? "Zoom out" : "Zoom in"}
                  </Button>
                )}
                <Button size="sm" onClick={() => download(active)} disabled={!active.output_url}>
                  <Download className="mr-1.5 h-4 w-4" /> {t("common.download")}
                </Button>
                {active.type !== "music" && (
                  <Button variant="outline" size="sm" onClick={() => editAgain(active)} disabled={!active.output_url}>
                    <Pencil className="mr-1.5 h-4 w-4" /> {t("common.editAgain")}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => remove(active)}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> {t("common.delete")}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(active.created_at).toLocaleString()}
                {isAutoEditGeneration(active)
                  ? " · Auto Edit"
                  : ` · ${CREDIT_COST[active.type as keyof typeof CREDIT_COST] ?? "—"} credits`}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
