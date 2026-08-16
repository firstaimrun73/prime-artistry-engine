import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History as HistoryIcon,
  Music,
  Image as ImageIcon,
  Video,
  ArrowRight,
  Settings,
  User,
  Wrench,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { getPlan, type PlanId } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

/**
 * Post-login home — compact professional dashboard.
 * Order: Welcome → Featured create → Studios → Recent → Quick access.
 */
export function SignedInHomeBody() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const isAdmin = isAdminEmail(profile?.email);
  const [recent, setRecent] = useState<RecentGen[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("generations")
      .select("id, type, prompt, output_url, created_at")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => {
        if (data) setRecent(data as RecentGen[]);
      });
  }, [user]);

  const planId = (profile?.plan ?? "free") as PlanId;
  const plan = getPlan(planId);
  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "";
  const credits = isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString();
  const videoLocked = !plan.video && !isAdmin;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-5 pb-24 sm:pt-8 md:pb-12">
      {/* 1. Welcome */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.welcome")}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
              {t("home.readyCreate")}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <CrownBadge plan={planId} showLabel size="md" />
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("home.credits")}:{" "}
                <span className="font-semibold text-foreground">{credits}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Featured creation — dominant CTA */}
      <section className="mt-5">
        <Link
          to="/editor"
          className="flex flex-col gap-3 rounded-2xl border border-primary/40 bg-primary/5 p-4 transition-colors hover:bg-primary/10 sm:flex-row sm:items-center sm:justify-between sm:p-5"
        >
          <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/30 bg-background p-2.5">
              <ImageIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-base font-bold">Image Editor</p>
              <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
                Upload, edit, enhance, remove objects, and generate
              </p>
            </div>
          </div>
          <span className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground sm:shrink-0">
            Open editor <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>

      {/* 3. Other studios */}
      <section className="mt-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Studios</h2>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Link
            to={videoLocked ? "/pricing" : "/studio/video"}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <Video className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Video Studio</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {videoLocked ? "Requires Lite or higher" : "Text-to-video & image-to-video"}
            </p>
            {videoLocked && (
              <span className="mt-1 inline-block text-[10px] font-semibold text-primary">Upgrade</span>
            )}
          </Link>
          <Link
            to={videoLocked ? "/pricing" : "/music"}
            className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <Music className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold">Music Studio</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {videoLocked ? "Requires Lite or higher" : "Tracks by mood & genre"}
            </p>
            {videoLocked && (
              <span className="mt-1 inline-block text-[10px] font-semibold text-primary">Upgrade</span>
            )}
          </Link>
        </div>
      </section>

      {/* 4. Recent */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" /> Recent
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center">
            <p className="text-sm text-muted-foreground">No creations yet.</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/editor">Start in Image Editor</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recent.map((g) => (
              <Link
                key={g.id}
                to="/history"
                className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
              >
                {g.output_url && g.type !== "music" ? (
                  g.type === "video" ? (
                    <video src={g.output_url} className="h-full w-full object-cover" muted playsInline />
                  ) : (
                    <img
                      src={g.output_url}
                      alt=""
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.opacity = "0.3";
                      }}
                    />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* 5. Quick access */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick access
        </h2>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/studio/image/tools">
              <Wrench className="mr-1.5 h-3.5 w-3.5" />
              Image Tools
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/history">
              <HistoryIcon className="mr-1.5 h-3.5 w-3.5" />
              History
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard">
              <User className="mr-1.5 h-3.5 w-3.5" />
              Profile
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/settings">
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Settings
            </Link>
          </Button>
        </div>
      </section>

      {planId !== "business" && (
        <p className="mt-8 text-center text-xs text-muted-foreground">
          On {plan.name} ·{" "}
          <Link to="/pricing" className="font-medium text-primary hover:underline">
            View plans
          </Link>
        </p>
      )}
    </main>
  );
}
