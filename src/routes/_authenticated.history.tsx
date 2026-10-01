import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { InContentAd } from "@/components/ads";
import { MusicHistoryList } from "@/components/MusicHistoryList";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription, DialogFooter, DialogHeader,
} from "@/components/ui/dialog";
import { CREDIT_COST } from "@/lib/plans";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { secureDownloadImage } from "@/lib/download.functions";
import { resolveHistoryMediaUrls } from "@/lib/private-media.functions";
import { useI18n } from "@/lib/i18n";
import {
  Download, Pencil, Trash2, ZoomIn, ZoomOut, Image as ImageIcon, Lock,
  Video, History as HistoryIcon, FolderOpen, Music, Sparkles, Circle, Aperture,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { isVisibleInHistory, historyUserDelete } from "@/lib/history-retention";
import { isFreePlan, isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type GenerationMeta = {
  experience?: string; source?: string; quality?: string; mode?: string;
  feature?: string; operation?: string; [key: string]: unknown;
};
type Generation = {
  id: string; type: string; prompt: string | null; output_url: string | null;
  status: string; created_at: string; metadata?: GenerationMeta | null;
  retained_as_history?: boolean | null; deleted_at?: string | null;
  expires_at?: string | null;
  storage_provider?: string | null;
  r2_object_key?: string | null;
};
type HistoryCategory = "image" | "video" | "auto" | "circle" | "lenses" | "music" | "other";

function safeText(value: unknown, fallback = ""): string {
  if (value == null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try { const s = JSON.stringify(value); return s && s !== "{}" ? s : fallback; } catch { return fallback; }
}
function isAutoEditGeneration(g: Generation): boolean {
  const m = g.metadata;
  if (m && typeof m === "object") {
    if (m.experience === "auto-edit") return true;
    if (m.source === "standalone_auto") return true;
    if (typeof m.operation === "string" && m.operation.startsWith("auto_edit")) return true;
  }
  const p = safeText(g.prompt).toLowerCase();
  return p.includes("maluto ai") || p.includes("motio2edit-auto") || p === "maluto ai auto edit" || p.includes("auto edit");
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
const CATEGORY_STYLES: Record<HistoryCategory, { border: string; mediaBg: string; badge: string; footer: string; label: string }> = {
  image: { border: "border-orange-300/60 hover:border-primary dark:border-orange-500/35", mediaBg: "bg-muted/30", badge: "bg-primary/90 text-primary-foreground", footer: "bg-orange-500/5", label: "Image" },
  video: { border: "border-rose-300/70 hover:border-rose-500 dark:border-rose-500/40", mediaBg: "bg-muted/30", badge: "bg-rose-600/90 text-white", footer: "bg-rose-500/5", label: "Video" },
  auto: { border: "border-violet-300/70 hover:border-violet-500 dark:border-violet-500/40", mediaBg: "bg-muted/30", badge: "bg-gradient-to-r from-violet-600 to-cyan-500 text-white", footer: "bg-violet-500/5", label: "Auto Edit" },
  circle: { border: "border-[#7B6FE0]/50 hover:border-[#7B6FE0] dark:border-[#7B6FE0]/40", mediaBg: "bg-muted/30", badge: "bg-[#7B6FE0] text-white", footer: "bg-[#7B6FE0]/5", label: "Circle 2edit" },
  lenses: { border: "border-cyan-300/60 hover:border-cyan-500 dark:border-cyan-500/40", mediaBg: "bg-muted/30", badge: "bg-cyan-600/90 text-white", footer: "bg-cyan-500/5", label: "AI+ Lenses" },
  music: { border: "border-purple-300/60 hover:border-purple-500 dark:border-purple-500/40", mediaBg: "bg-muted/30", badge: "bg-purple-600/90 text-white", footer: "bg-purple-500/5", label: "Music" },
  other: { border: "border-border hover:border-primary", mediaBg: "bg-muted/30", badge: "bg-background/80", footer: "", label: "Media" },
};

function HistoryPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const secureDownload = useServerFn(secureDownloadImage);
  const resolveHistoryMedia = useServerFn(resolveHistoryMediaUrls);
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [active, setActive] = useState<Generation | null>(null);
  const [zoomed, setZoomed] = useState(false);
  const [tab, setTab] = useState<"all" | "auto" | "images" | "videos" | "music">("all");
  const [pendingDelete, setPendingDelete] = useState<Generation | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [plan, setPlan] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [historyWatermarkOn, setHistoryWatermarkOn] = useState(true);
  const [previewDisplayUrl, setPreviewDisplayUrl] = useState<string | null>(null);
  const [wmBusy, setWmBusy] = useState(false);
  const isFreeUser = isFreePlan(plan);
  const historyUnlocked = isPaidPlan(plan) || isAdminEmail(profileEmail ?? user?.email ?? undefined);

  const load = async () => {
    if (!user) { setLoading(false); setGens([]); setLoadError(null); return; }
    setLoading(true); setLoadError(null);
    try {
      let rows: Generation[] = [];
      const full = await supabase
        .from("generations")
        .select("id, type, prompt, output_url, status, created_at, metadata, retained_as_history, deleted_at, expires_at, storage_provider, r2_object_key")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!full.error && full.data) {
        rows = ((full.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
      } else {
        if (full.error) console.warn("[history] full select:", full.error.message);
        const core = await supabase
          .from("generations")
          .select("id, type, prompt, output_url, status, created_at, metadata, retained_as_history, deleted_at, storage_provider, r2_object_key")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(100);
        if (!core.error && core.data) {
          rows = ((core.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        } else {
          if (core.error) console.warn("[history] core select:", core.error.message);
          const min = await supabase
            .from("generations")
            .select("id, type, prompt, output_url, status, created_at, metadata")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100);
          if (min.error) {
            console.error("[history] all selects failed:", min.error.message);
            setGens([]);
            setLoadError(min.error.message);
            toast.error("Could not load history.");
            setLoading(false);
            return;
          }
          rows = ((min.data as Generation[]) ?? []).filter((g) => isVisibleInHistory(g));
        }
      }
      try {
        const ids = rows.map((g) => g.id).filter(Boolean);
        if (ids.length > 0) {
          const resolved = await resolveHistoryMedia({ data: { generationIds: ids } });
          const map = resolved?.urls ?? {};
          rows = rows.map((g) => {
            const delivery = map[g.id];
            if (delivery && delivery.startsWith("https://")) {
              return { ...g, output_url: delivery };
            }
            return g;
          });
        }
      } catch (e) {
        console.warn("[history] media resolve skipped:", e);
      }
      setGens(rows);
      setLoadError(null);
    } catch (e) {
      console.error("[history] unexpected load error:", e);
      setGens([]);
      setLoadError(e instanceof Error ? e.message : "Unknown error");
      toast.error("Could not load history.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { void load(); }, [user]);
  useEffect(() => {
    if (!user) { setPlan(null); setProfileEmail(null); return; }
    void supabase.from("profiles").select("plan, email").eq("id", user.id).maybeSingle().then(({ data }) => {
      setPlan((data?.plan as string | undefined) ?? "free");
      setProfileEmail((data?.email as string | undefined) ?? null);
    });
  }, [user]);

  useEffect(() => {
    if (!active) { setPreviewDisplayUrl(null); return; }
    if (isFreeUser) setHistoryWatermarkOn(true);
  }, [active?.id, isFreeUser]);

  useEffect(() => {
    if (!active || active.type !== "image" || !active.output_url) {
      setPreviewDisplayUrl(active?.output_url ?? null);
      return;
    }
    let cancelled = false;
    const wantWm = isFreeUser ? true : historyWatermarkOn;
    if (!wantWm) { setPreviewDisplayUrl(active.output_url); return; }
    setWmBusy(true);
    void (async () => {
      try {
        const res = await secureDownload({
          data: {
            generationId: active.id,
            imageUrl: active.output_url.startsWith("https://") ? active.output_url : undefined,
            keepWatermark: true,
          },
        });
        if (!cancelled) setPreviewDisplayUrl(res?.downloadUrl || res?.url || active.output_url);
      } catch (e) {
        console.warn("[history] watermark display resolve failed:", e);
        if (!cancelled) setPreviewDisplayUrl(active.output_url);
      } finally {
        if (!cancelled) setWmBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [active?.id, active?.output_url, active?.type, historyWatermarkOn, isFreeUser]);

  const open = (g: Generation) => {
    if (!historyUnlocked) return;
    setActive(g); setZoomed(false);
  };
  const download = async (g: Generation) => {
    if (!historyUnlocked) return;
    if (!g.output_url && g.type === "image") return;
    try {
      let href = g.output_url || "";
      if (g.type === "image") {
        const wantWm = isFreeUser ? true : (active?.id === g.id ? historyWatermarkOn : true);
        const res = await secureDownload({
          data: {
            generationId: g.id,
            imageUrl: g.output_url?.startsWith("https://") ? g.output_url : undefined,
            keepWatermark: wantWm,
          },
        });
        href = res?.downloadUrl || res?.url || "";
        if (!href) throw new Error("Download failed.");
      }
      if (!href) return;
      if (href.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = href;
        a.download = `motio2edit-${g.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
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
      }
      toast.success("⬇️ Download started!");
    } catch (e) {
      console.error("[history] download failed:", e);
      toast.error(e instanceof Error ? e.message : "Download failed. Please try again.");
    }
  };
  const editAgain = (g: Generation) => {
    if (!g.output_url) return;
    if (isAutoEditGeneration(g)) { navigate({ to: "/studio/image/auto-edit" }); return; }
    if (isCircleGeneration(g)) { navigate({ to: "/studio/image/circle-remove", search: { from: "history" as const } }); return; }
    sessionStorage.setItem("motio2edit-reuse", JSON.stringify({ url: g.output_url, kind: g.type === "video" ? "video" : "image" }));
    navigate({ to: "/editor" });
  };
  const visibleGens = gens.filter((g) => {
    if (tab === "all") return true;
    if (tab === "auto") return isAutoEditGeneration(g);
    if (tab === "images") {
      if (g.type === "video" || g.type === "music") return false;
      if (isAutoEditGeneration(g)) return false;
      return g.type === "image" || isCircleGeneration(g) || isLensesGeneration(g);
    }
    if (tab === "videos") return g.type === "video";
    return false;
  });
  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const result = await historyUserDelete(pendingDelete.id);
    setDeleting(false);
    if (!result.ok) { toast.error(result.message || "Could not remove this item from History."); return; }
    setGens((prev) => prev.filter((x) => x.id !== pendingDelete.id));
    if (active?.id === pendingDelete.id) setActive(null);
    setPendingDelete(null);
    toast.success("Removed from History.");
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
          { id: "images" as const, label: "Images" },
          { id: "videos" as const, label: "Videos" },
          { id: "music" as const, label: t("history.music") },
        ]).map((tabItem) => (
          <button key={tabItem.id} type="button" onClick={() => setTab(tabItem.id)}
            className={`rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors ${
              tab === tabItem.id ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary"
            }`}>{tabItem.label}</button>
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
          <Button size="sm" className="mt-4" variant="outline" onClick={load}>Retry</Button>
        </div>
      ) : tab !== "music" && visibleGens.length === 0 && gens.length > 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm font-medium text-foreground">No items in this filter</p>
          <p className="mt-1 text-sm text-muted-foreground">Try All or another tab.</p>
        </div>
      ) : gens.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/70" strokeWidth={1.5} />
          <p className="mt-4 text-sm font-semibold text-foreground">No creations yet</p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
            Your generated images, videos and music will appear here.
          </p>
        </div>
      ) : (
        <div className="mt-8 columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
          {visibleGens.map((g) => {
            const cat = getHistoryCategory(g);
            const styles = CATEGORY_STYLES[cat];
            return (
              <div
                key={g.id}
                role={historyUnlocked ? "button" : undefined}
                tabIndex={historyUnlocked ? 0 : undefined}
                onClick={() => historyUnlocked && open(g)}
                onKeyDown={(e) => {
                  if (historyUnlocked && (e.key === "Enter" || e.key === " ")) open(g);
                }}
                className={cn(
                  "group mb-3 w-full break-inside-avoid overflow-hidden rounded-xl border bg-card text-left transition-colors",
                  styles.border,
                  !historyUnlocked && "cursor-default opacity-90",
                  historyUnlocked && "cursor-pointer",
                )}
              >
                <div className={cn("relative w-full overflow-hidden", styles.mediaBg)}>
                  {g.output_url ? (
                    g.type === "video" ? (
                      <video src={g.output_url} className="aspect-video w-full object-cover" muted playsInline preload="metadata" />
                    ) : g.type === "music" ? (
                      <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-gradient-to-br from-purple-500/25 to-purple-500/5">
                        <Music className="h-8 w-8 text-primary" /><span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Audio</span>
                      </div>
                    ) : (
                      <img src={g.output_url} alt={safeText(g.prompt, "Generated")} loading="lazy" className="block h-auto w-full" />
                    )
                  ) : (
                    <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  {!historyUnlocked && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-background/55 backdrop-blur-[2px]">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm">
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        Upgrade to unlock
                      </span>
                    </div>
                  )}
                  <span className={cn("absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-sm", styles.badge)}>{styles.label}</span>
                </div>
                <div className={cn("p-2.5", styles.footer)}>
                  <p className="truncate text-xs font-medium">{safeText(g.prompt, t("history.untitled"))}</p>
                  <p className="mt-0.5 text-[10px] text-muted-foreground">{new Date(g.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent className={cn("max-w-3xl", zoomed && "max-w-5xl")}>
          <DialogHeader>
            <DialogTitle className="truncate">{safeText(active?.prompt, t("history.untitled"))}</DialogTitle>
            <DialogDescription className="capitalize">{active?.type} · {active ? new Date(active.created_at).toLocaleString() : ""}</DialogDescription>
          </DialogHeader>
          {active?.output_url && (
            <div className="relative overflow-hidden rounded-lg bg-secondary">
              {active.type === "video" ? (
                <video src={active.output_url} className="max-h-[70vh] w-full object-contain" controls playsInline />
              ) : active.type === "music" ? (
                <div className="flex flex-col items-center gap-4 p-10">
                  <Music className="h-12 w-12 text-primary" />
                  <audio src={active.output_url} controls className="w-full" />
                </div>
              ) : (
                <img src={previewDisplayUrl || active.output_url} alt={safeText(active.prompt, "Generated")} className="max-h-[70vh] w-full object-contain" />
              )}
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {active?.type === "image" && !isFreeUser && (
              <Button size="sm" variant="outline" disabled={wmBusy} onClick={() => setHistoryWatermarkOn((v) => !v)}>
                {historyWatermarkOn ? "Preview without watermark" : "Preview with watermark"}
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setZoomed((z) => !z)}>
              {zoomed ? <ZoomOut className="mr-1 h-4 w-4" /> : <ZoomIn className="mr-1 h-4 w-4" />}
              {zoomed ? "Fit" : "Zoom"}
            </Button>
            <Button size="sm" onClick={() => active && download(active)}>
              <Download className="mr-1 h-4 w-4" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={() => active && editAgain(active)}>
              <Pencil className="mr-1 h-4 w-4" /> Edit again
            </Button>
            <Button size="sm" variant="destructive" onClick={() => active && setPendingDelete(active)}>
              <Trash2 className="mr-1 h-4 w-4" /> Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove from History?</DialogTitle>
            <DialogDescription>This removes the item from your History. It cannot be undone from this screen.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Removing…" : "Remove"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
