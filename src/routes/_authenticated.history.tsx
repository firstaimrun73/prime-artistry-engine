import { createFileRoute, Link } from "@tanstack/react-router";
import { DirectLinkAd } from "@/components/ads";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { isVisibleInHistory } from "@/lib/history-retention";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import {
  Image as ImageIcon,
  Video,
  Music,
  FolderOpen,
  Lock,
  History as HistoryIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

type Gen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
  retained_as_history?: boolean | null;
  deleted_at?: string | null;
  expires_at?: string | null;
};

const SELECT_FULL =
  "id, type, prompt, output_url, status, created_at, retained_as_history, deleted_at, expires_at";
const SELECT_MIN = "id, type, prompt, output_url, status, created_at";

function HistoryPage() {
  const { user, profile } = useAuth();
  const [gens, setGens] = useState<Gen[]>([]);
  const [loading, setLoading] = useState(true);
  const unlocked = isPaidPlan(profile?.plan) || isAdminEmail(profile?.email);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      let rows: Gen[] = [];
      const full = await supabase
        .from("generations")
        .select(SELECT_FULL)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);
      if (!full.error && full.data) {
        rows = (full.data as Gen[]).filter((g) => isVisibleInHistory(g));
      } else {
        const min = await supabase
          .from("generations")
          .select(SELECT_MIN)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(60);
        if (!min.error && min.data) rows = min.data as Gen[];
      }
      setGens(rows);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 pb-24">
      <div className="mb-6 flex items-center gap-2">
        <HistoryIcon className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">History</h1>
      </div>

      <DirectLinkAd placement="history-top" variant="compact" />

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl border border-border bg-muted/60" />
          ))}
        </div>
      ) : gens.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <FolderOpen className="mx-auto h-11 w-11 text-muted-foreground/70" strokeWidth={1.5} />
          <p className="mt-4 text-sm font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create something in Studio — it will appear here.</p>
          <Link
            to="/studio"
            className="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Open Studio
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {gens.map((g) => {
            const media = g.output_url ? (
              g.type === "video" ? (
                <div className="relative aspect-square w-full bg-secondary">
                  <video src={g.output_url} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                  <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-[10px] font-semibold backdrop-blur">
                    <Video className="h-3 w-3" /> Video
                  </span>
                </div>
              ) : g.type === "music" ? (
                <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-secondary">
                  <Music className="h-6 w-6 text-primary" />
                  <span className="text-xs text-muted-foreground">Music</span>
                </div>
              ) : (
                <img
                  src={g.output_url}
                  alt={g.prompt ?? "Generated"}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.opacity = "0.35";
                  }}
                />
              )
            ) : (
              <div className="flex aspect-square w-full items-center justify-center bg-secondary">
                <ImageIcon className="h-6 w-6 text-muted-foreground" />
              </div>
            );

            return (
              <div
                key={g.id}
                className="relative overflow-hidden rounded-xl border border-border bg-card"
              >
                {media}
                {!unlocked && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-background/55 backdrop-blur-[2px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <Link to="/pricing" className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      Upgrade to unlock
                    </Link>
                  </div>
                )}
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{g.prompt ?? "Untitled"}</p>
                  <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                    {g.type} · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DirectLinkAd placement="history-mid" className="mt-8" />
    </div>
  );
}
