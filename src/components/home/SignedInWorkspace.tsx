import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DirectLinkAd } from "@/components/ads";
import { SignedInStudioCards } from "@/components/SignedInStudioCards";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { isPaidPlan } from "@/lib/policy";
import { supabase } from "@/integrations/supabase/client";
import { isVisibleInHistory } from "@/lib/history-retention";
import { History as HistoryIcon, Music, Lock } from "lucide-react";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
  metadata?: unknown;
  retained_as_history?: boolean | null;
  deleted_at?: string | null;
  expires_at?: string | null;
};

/**
 * Authenticated homepage body.
 * Keeps existing branding; adds discoverability without a full redesign.
 * "Recent history" uses the same visibility rules as History / Profile Recent Projects.
 */
export function SignedInWorkspace() {
  const { user, profile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);
  const historyUnlocked = isAdmin || isPaidPlan(profile?.plan);
  const [recent, setRecent] = useState<RecentGen[]>([]);
  const plan = (profile?.plan ?? "free") as string;
  const planLabel =
    plan === "business" ? "Master Studio" : plan.charAt(0).toUpperCase() + plan.slice(1);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const full = await supabase
        .from("generations")
        .select(
          "id, type, prompt, output_url, created_at, metadata, retained_as_history, deleted_at, expires_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!full.error && full.data) {
        const rows = (full.data as RecentGen[]).filter((g) => isVisibleInHistory(g));
        setRecent(rows.slice(0, 6));
        return;
      }

      const core = await supabase
        .from("generations")
        .select("id, type, prompt, output_url, created_at, metadata")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);
      if (!core.error && core.data) {
        const rows = (core.data as RecentGen[]).filter((g) => isVisibleInHistory(g));
        setRecent(rows.slice(0, 6));
      }
    })();
  }, [user]);

  // Free: History quick action → Pricing/Plans. Paid: History.
  const historyOrPlans = historyUnlocked
    ? { to: "/history" as const, label: "History", desc: "Recent projects" }
    : { to: "/pricing" as const, label: "Plans", desc: "Upgrade for history" };

  const quickActions: {
    to: "/editor" | "/studio/image" | "/history" | "/dashboard" | "/pricing";
    label: string;
    desc: string;
    primary?: boolean;
  }[] = [
    { to: "/editor", label: "Open Image Editor", desc: "Full workspace", primary: true },
    { to: "/studio/image", label: "Image tools", desc: "Presets & shortcuts" },
    historyOrPlans,
    { to: "/dashboard", label: "Profile", desc: "Plan & account" },
  ];

  const tools: {
    to: "/editor" | "/studio/image" | "/studio/video" | "/music";
    label: string;
    desc: string;
  }[] = [
    { to: "/editor", label: "Circle to Remove", desc: "Mark and erase objects" },
    { to: "/studio/image", label: "Background removal", desc: "Clean cut-outs" },
    { to: "/studio/image", label: "Image enhancement", desc: "Upscale & restore" },
    { to: "/studio/video", label: "Video creation", desc: "Text & image to video" },
    { to: "/music", label: "Music Studio", desc: "Mood & genre tracks" },
    { to: "/editor", label: "Generate from text", desc: "New image from prompt" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 md:pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              Welcome back{profile?.display_name ? `, ${profile.display_name.split(" ")[0]}` : ""}.
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your AI creative workspace — image, video, and music in one place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Link
              to="/pricing"
              className="min-w-[7.5rem] rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-primary/40 sm:text-right"
            >
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Credits
              </div>
              <div className="text-2xl font-extrabold text-primary">
                {isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString()}
              </div>
              <div className="mt-0.5 text-[10px] text-muted-foreground">View plans →</div>
            </Link>
            <div className="min-w-[7.5rem] rounded-xl border border-border bg-card px-4 py-3">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Plan
              </div>
              <div className="text-lg font-bold">{planLabel}</div>
              <Link to="/settings" className="mt-0.5 block text-[10px] text-primary hover:underline">
                Settings →
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quick start
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {quickActions.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className={
                  "rounded-xl border px-3 py-3 transition-colors hover:border-primary/50 " +
                  (a.primary
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border bg-card text-foreground")
                }
              >
                <div className="text-sm font-semibold">{a.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{a.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        <DirectLinkAd placement="workspace-upper" variant="compact" />

        <SignedInStudioCards />

        <DirectLinkAd placement="workspace-mid" />

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            What you can do
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tools.map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className="rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
              >
                <div className="text-sm font-semibold">{t.label}</div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">{t.desc}</div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <HistoryIcon className="h-4 w-4" /> Recent history
            </h2>
            {historyUnlocked ? (
              <Link to="/history" className="text-xs font-medium text-primary hover:underline">
                View all →
              </Link>
            ) : (
              <Link to="/pricing" className="text-xs font-medium text-primary hover:underline">
                Unlock with a plan →
              </Link>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
              No generations yet — open the Image Editor or pick a studio above.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {recent.map((g) => {
                const media =
                  g.output_url && g.type !== "music" ? (
                    g.type === "video" ? (
                      <video
                        src={g.output_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={g.output_url}
                        alt={g.prompt ?? ""}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    )
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-muted">
                      <Music className="h-6 w-6 text-muted-foreground" />
                    </div>
                  );
                if (historyUnlocked) {
                  return (
                    <Link
                      key={g.id}
                      to="/history"
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
                    >
                      {media}
                    </Link>
                  );
                }
                return (
                  <div
                    key={g.id}
                    className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card opacity-90"
                  >
                    {media}
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-background/55 backdrop-blur-[2px]">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <span className="text-[9px] font-semibold text-muted-foreground">Locked</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <DirectLinkAd placement="workspace-lower" />
      </main>
      <Footer />
    </div>
  );
}
