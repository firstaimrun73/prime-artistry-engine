import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History as HistoryIcon,
  Music,
  Image as ImageIcon,
  Video,
  Sparkles,
  ArrowRight,
  Settings,
  User,
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
 * Post-login home — action-first, not a wall of education cards.
 * Mobile-first spacing; desktop uses width without crowding.
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

  const studios = [
    {
      to: "/editor" as const,
      icon: ImageIcon,
      title: "Image Editor",
      body: "Edit photos, remove objects, enhance & restore",
      primary: true,
    },
    {
      to: "/studio/video" as const,
      icon: Video,
      title: "Video Studio",
      body: plan.video ? "Text-to-video & image-to-video" : "Requires Lite or higher",
      locked: !plan.video && !isAdmin,
    },
    {
      to: "/music" as const,
      icon: Music,
      title: "Music Studio",
      body: plan.video ? "Generate tracks by mood & genre" : "Requires Lite or higher",
      locked: !plan.video && !isAdmin,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-24 sm:pt-8 md:pb-12">
      {/* Welcome — compact */}
      <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.welcome")}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">
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
          <Button asChild className="w-full shrink-0 sm:w-auto">
            <Link to="/editor">
              Open Image Editor <ArrowRight className="ml-1.5 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Primary studios — 3 clear actions */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Create
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {studios.map((s) => {
            const Icon = s.icon;
            const inner = (
              <>
                <div className="flex items-center gap-2">
                  <div className="rounded-lg border border-border bg-background p-2">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{s.title}</p>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.body}</p>
                {s.locked && (
                  <span className="mt-2 inline-block text-[10px] font-semibold text-primary">
                    Upgrade to unlock
                  </span>
                )}
              </>
            );
            if (s.locked) {
              return (
                <Link
                  key={s.title}
                  to="/pricing"
                  className="rounded-xl border border-border bg-card p-4 opacity-90 transition-colors hover:border-primary/40"
                >
                  {inner}
                </Link>
              );
            }
            return (
              <Link
                key={s.title}
                to={s.to}
                className={`rounded-xl border p-4 transition-colors hover:border-primary/50 ${
                  s.primary
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                {inner}
              </Link>
            );
          })}
        </div>
      </section>

      {/* Auto Edit — short, not a lecture */}
      <section className="mt-6 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold">Auto Edit</h2>
            </div>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Describe what you want in plain language — e.g. “Remove the person behind me.”
              Opens in the Image Editor.
            </p>
          </div>
          <Button asChild size="sm" className="w-full shrink-0 sm:w-auto">
            <Link to="/editor">Try Auto Edit</Link>
          </Button>
        </div>
      </section>

      {/* Quick links — single row, no duplication of bottom nav */}
      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Quick access
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button asChild size="sm" variant="outline">
            <Link to="/studio/image/tools">Image Tools</Link>
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

      {/* Recent — useful or empty CTA */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" /> Recent
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center">
            <p className="text-sm text-muted-foreground">Your creations will appear here.</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/editor">Open Image Editor</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
            {recent.map((g) => (
              <Link
                key={g.id}
                to="/history"
                className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
              >
                {g.output_url && g.type !== "music" ? (
                  g.type === "video" ? (
                    <video
                      src={g.output_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
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
