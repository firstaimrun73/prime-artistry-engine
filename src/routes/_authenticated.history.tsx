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
  DialogFooter,
  DialogHeader,
} from "@/components/ui/dialog";
import { CREDIT_COST } from "@/lib/plans";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { secureDownloadImage } from "@/lib/download.functions";
import { useI18n } from "@/lib/i18n";
import {
  Download, Pencil, Trash2, ZoomIn, ZoomOut, Image as ImageIcon,
  Video, History as HistoryIcon, FolderOpen, Music, Sparkles, Circle, Aperture,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type GenerationMeta = {
  experience?: string;
  source?: string;
  quality?: string;
  mode?: string;
  feature?: string;
  operation?: string;
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

/** Category identity for History cards — matches Studio base colours. */
type HistoryCategory = "image" | "video" | "auto" | "circle" | "lenses" | "music" | "other";

/** Never render [object Object] from prompt/metadata. */
function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    const s = JSON.stringify(value);
    return s && s !== "{}" ? s : fallback;
  } catch {
    return fallback;
  }
}

function isAutoEditGeneration(g: Generation): boolean {
  const m = g.metadata;
  if (m && typeof m === "object") {
    if (m.experience === "auto-edit") return true;
    if (m.source === "standalone_auto") return true;
    if (typeof m.operation === "string" && m.operation.startsWith("auto_edit")) return true;
  }
  const p = safeText(g.prompt).toLowerCase();
  return (
    p.includes("maluto ai") ||
    p.includes("motio2edit-auto") ||
    p === "maluto ai auto edit" ||
    p.includes("auto edit")
  );
}

function isCircleGeneration(g: Generation): boolean {
  const m = g.metadata;
  if (m && typeof m === "object") {
    const exp = String(m.experience || "").toLowerCase();
    const src = String(m.source || "").toLowerCase();
    const mode = String(m.mode || "").toLowerCase();
    const feat = String(m.feature || "").toLowerCase();
    const op = String(m.operation || "").toLowerCase();
    if (exp.includes("circle") || src.includes("circle")) return true;
    if (mode.includes("circle") || feat.includes("circle")) return true;
    if (op.includes("circle_to_") || op.includes("circle-")) return true;
  }
  const p = safeText(g.prompt).toLowerCase();
  return p.includes("circle 2edit") || p.includes("circle to add") || p.includes("circle to remove");
}

function isLensesGeneration(g: Generation): boolean {
  const m = g.metadata;
  if (m && typeof m === "object") {
    const exp = String(m.experience || "").toLowerCase();
    const src = String(m.source || "").toLowerCase();
    const feat = String(m.feature || "").toLowerCase();
    if (exp.includes("lens") || src.includes("lens") || feat.includes("lens")) return true;
    if (exp.includes("ai+") || src.includes("ai+")) return true;
  }
  const p = safeText(g.prompt).toLowerCase();
  return p.includes("ai+ lens") || p.includes("ai+ lenses") || p.includes("lens editor");
}

function getHistoryCategory(g: Generation): HistoryCategory {
  if (isAutoEditGeneration(g)) return "auto";
  if (isCircleGeneration(g)) return "circle";
  if (isLensesGeneration(g)) return "lenses";
  if (g.type === "video") return "video";
  if (g.type === "music") return "music";
  if (g.type === "image") return "image";
  return "other";
}

/** Existing category colour tokens — do not invent new systems. */
const CATEGORY_STYLES: Record<
  HistoryCategory,
  { border: string; mediaBg: string; badge: string; footer: string; label: string }
> = {
  image: {
    border: "border-orange-300/60 hover:border-primary dark:border-orange-500/35",
    mediaBg: "bg-orange-500/10",
    badge: "bg-primary/90 text-primary-foreground",
    footer: "bg-orange-500/5",
    label: "Image",
  },
  video: {
    border: "border-rose-300/70 hover:border-rose-500 dark:border-rose-500/40",
    mediaBg: "bg-rose-500/10",
    badge: "bg-rose-600/90 text-white",
    footer: "bg-rose-500/5",
    label: "Video",
  },
  auto: {
    border: "border-violet-300/70 hover:border-violet-500 dark:border-violet-500/40",
    mediaBg: "bg-violet-500/10",
    badge: "bg-gradient-to-r from-violet-600 to-cyan-500 text-white",
    footer: "bg-violet-500/5",
    label: "Auto Edit",
  },
  circle: {
    border: "border-[#7B6FE0]/50 hover:border-[#7B6FE0] dark:border-[#7B6FE0]/40",
    mediaBg: "bg-[#7B6FE0]/10",
    badge: "bg-[#7B6FE0] text-white",
    footer: "bg-[#7B6FE0]/5",
    label: "Circle 2edit",
  },
  lenses: {
    border: "border-cyan-300/60 hover:border-cyan-500 dark:border-cyan-500/40",
    mediaBg: "bg-cyan-500/10",
    badge: "bg-cyan-600/90 text-white",
    footer: "bg-cyan-500/5",
    label: "AI+ Lenses",
  },
  music: {
    border: "border-purple-300/60 hover:border-purple-500 dark:border-purple-500/40",
    mediaBg: "bg-purple-500/10",
    badge: "bg-purple-600/90 text-white",
    footer: "bg-purple-500/5",
    label: "Music",
  },
  other: {
    border: "border-border hover:border-primary",
    mediaBg: "bg-secondary",
    badge: "bg-background/80",
    footer: "",
    label: "Media",
  },
};

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
  const [tab, setTab] = useState<"all" | "auto" | "media" | "music">("all");
  const [pendingDelete, setPendingDelete] = useState<Generation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    if (!user) {
      setLoading(false);
      setGens([]);
      setLoadError(null);
      return;
    }
    setLoading(true);
    setLoadError(null);
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
    if (isCircleGeneration(g)) {
      navigate({ to: "/studio/image/circle-remove", search: { from: "history" as const } });
      return;
    }
    sessionStorage.setItem(
      "motio2edit-reuse",
      JSON.stringify({ url: g.output_url, kind: g.type === "video" ? "video" : "image" }),
    );
    navigate({ to: "/editor" });
  };

  const visibleGens = gens.filter((g) => {
    // Generative media only — already limited by generations table
    if (tab === "all") return g.type !== "music";
    if (tab === "auto") return isAutoEditGeneration(g);
    if (tab === "media") return !isAutoEditGeneration(g) && g.type !== "music";
    return false;
  });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { error } = await supabase.from("generations").delete().eq("id", pendingDelete.id);
    setDeleting(false);
    if (error) {
      toast.error("Could not delete this item.");
      return;
    }
    setGens((prev) => prev.filter((x) => x.id !== pendingDelete.id));
    if (active?.id === pendingDelete.id) setActive(null);
    setPendingDelete(null);
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
        {([
          { id: "all" as const, label: "All" },
          { id: "auto" as const, label: "Auto Edit" },
          { id: "media" as const, label: t("history.media") },
          { id: "music" as const, label: t("history.music") },
        ]).map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === tabItem.id
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary"
            }`}
          >
            {tabItem.label}
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
      ) : tab !== "music" && visibleGens.length === 0 && gens.length > 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">No items in this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">Try All or another tab.</p>
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
          {visibleGens.map((g) => {
            const cat = getHistoryCategory(g);
            const styles = CATEGORY_STYLES[cat];
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => open(g)}
                className={cn(
                  "group overflow-hidden rounded-xl border bg-card text-left transition-colors",
                  styles.border,
                )}
              >
                <div className={cn("relative aspect-square w-full", styles.mediaBg)}>
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
                        alt={safeText(g.prompt, "Generated")}
                        loading="lazy"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const el = e.target as HTMLImageElement;
                          el.style.display = "none";
                          const parent = el.parentElement;
                          if (parent && !parent.querySelector("[data-fallback]")) {
                            const fallback = document.createElement("div");
                            fallback.dataset.fallback = "1";
                            fallback.className =
                              "absolute inset-0 flex items-center justify-center bg-muted/40";
                            fallback.innerHTML =
                              '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-muted-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';
                            parent.appendChild(fallback);
                          }
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
                      styles.badge,
                    )}
                  >
                    {cat === "auto" ? (
                      <Sparkles className="h-3 w-3" />
                    ) : cat === "circle" ? (
                      <Circle className="h-3 w-3" />
                    ) : cat === "lenses" ? (
                      <Aperture className="h-3 w-3" />
                    ) : cat === "video" ? (
                      <Video className="h-3 w-3" />
                    ) : cat === "music" ? (
                      <Music className="h-3 w-3" />
                    ) : (
                      <ImageIcon className="h-3 w-3" />
                    )}
                    {styles.label}
                  </span>
                </div>
                <div className={cn("p-3", styles.footer)}>
                  <p className="truncate text-xs font-medium">
                    {cat === "auto"
                      ? "Maluto AI Auto Edit"
                      : cat === "circle"
                        ? "Circle 2edit"
                        : cat === "lenses"
                          ? "AI+ Lenses"
                          : safeText(g.prompt, t("history.untitled"))}
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

      {/* Preview dialog */}
      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className="max-w-4xl">
          {active && (
            <>
              <DialogTitle className="capitalize">
                {CATEGORY_STYLES[getHistoryCategory(active)].label} preview
              </DialogTitle>
              <DialogDescription className="line-clamp-2">
                {isAutoEditGeneration(active)
                  ? "Maluto AI Auto Edit"
                  : isCircleGeneration(active)
                    ? "Circle 2edit"
                    : isLensesGeneration(active)
                      ? "AI+ Lenses"
                      : safeText(active.prompt, "No prompt")}
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
                      alt={safeText(active.prompt, "Generated")}
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
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPendingDelete(active);
                  }}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> {t("common.delete")}
                </Button>
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {new Date(active.created_at).toLocaleString()}
                {isAutoEditGeneration(active)
                  ? " · Auto Edit"
                  : isCircleGeneration(active)
                    ? " · Circle 2edit"
                    : isLensesGeneration(active)
                      ? " · AI+ Lenses"
                      : ` · ${CREDIT_COST[active.type as keyof typeof CREDIT_COST] ?? "—"} credits`}
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation — required before permanent delete */}
      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && !deleting && setPendingDelete(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete permanently?</DialogTitle>
            <DialogDescription>
              This item will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              disabled={deleting}
              onClick={() => setPendingDelete(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleting}
              onClick={confirmDelete}
            >
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
