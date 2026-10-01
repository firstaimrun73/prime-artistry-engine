import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CrownBadge } from "@/components/CrownBadge";
import { useI18n } from "@/lib/i18n";
import {
  Coins,
  Crown,
  Image as ImageIcon,
  History,
  FolderOpen,
  Ticket,
  HelpCircle,
  Mail,
  CheckCircle2,
  Video,
  Music,
  Shield,
  ArrowRight,
  BookOpen,
  Lock,
  Settings,
} from "lucide-react";
import {
  isVisibleInHistory,
} from "@/lib/history-retention";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

/** Same visibility fields as History page — isVisibleInHistory needs the full row. */
type Generation = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  status: string;
  created_at: string;
  metadata?: unknown;
  retained_as_history?: boolean | null;
  deleted_at?: string | null;
  expires_at?: string | null;
  storage_provider?: string | null;
  r2_object_key?: string | null;
};

const HISTORY_SELECT =
  "id, type, prompt, output_url, status, created_at, metadata, retained_as_history, deleted_at, expires_at, storage_provider, r2_object_key";
const HISTORY_SELECT_CORE =
  "id, type, prompt, output_url, status, created_at, metadata, retained_as_history, deleted_at, storage_provider, r2_object_key";
const HISTORY_SELECT_MIN =
  "id, type, prompt, output_url, status, created_at, metadata";

export function Dashboard() {
  const { profile, user } = useAuth();
  const { t } = useI18n();
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    void (async () => {
      // Prefer full retention columns so Profile Recent Projects matches History rules.
      let rows: Generation[] = [];
      const full = await supabase
        .from("generations")
        .select(HISTORY_SELECT)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(24);

      if (!full.error && full.data) {
        rows = (full.data as Generation[]).filter((g) => isVisibleInHistory(g));
      } else {
        if (full.error) console.warn("[dashboard] full select:", full.error.message);
        const core = await supabase
          .from("generations")
          .select(HISTORY_SELECT_CORE)
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(24);
        if (!core.error && core.data) {
          rows = (core.data as Generation[]).filter((g) => isVisibleInHistory(g));
        } else {
          if (core.error) console.warn("[dashboard] core select:", core.error.message);
          const min = await supabase
            .from("generations")
            .select(HISTORY_SELECT_MIN)
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(24);
          if (!min.error && min.data) {
            rows = (min.data as Generation[]).filter((g) => isVisibleInHistory(g));
          }
        }
      }

      setGens(rows.slice(0, 8));
      setLoading(false);
    })();
  }, [user]);

  if (!profile) return null;
  const historyUnlocked = isPaidPlan(profile.plan) || isAdminEmail(profile.email);
  const plan = getPlan(profile.plan);
  const allocation = PLAN_CREDITS[profile.plan] ?? 0;
  const used = Math.max(0, allocation - profile.credits);
  const images = gens.filter((g) => g.type === "image").length;
  const videos = gens.filter((g) => g.type === "video").length;
  const musicCount = gens.filter((g) => g.type === "music").length;

  const resources = [
    { to: "/settings" as const, icon: Settings, title: "Settings", body: "Theme, language, avatar, logout & preferences" },
    { to: "/about" as const, icon: BookOpen, title: "About Product", body: "Product overview — studios, tools, credits, and how editing works" },
    { to: "/pricing" as const, icon: Crown, title: t("nav.pricing"), body: "Plans and credits" },
    { to: "/faq" as const, icon: HelpCircle, title: "FAQ", body: "Common questions" },
    { to: "/security" as const, icon: Shield, title: "Security", body: "How we protect your data" },
    { to: "/support" as const, icon: Mail, title: "Support", body: "Help center" },
    { to: "/tickets" as const, icon: Ticket, title: "Tickets", body: "Track support requests" },
    { to: "/history" as const, icon: History, title: t("nav.history"), body: "All your creations" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 pb-24 md:py-12 md:pb-12">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="h-14 w-14 shrink-0">
              <AvatarImage src={profile.avatar_signed_url ?? undefined} alt={profile.display_name ?? "Avatar"} />
              <AvatarFallback className="text-lg">
                {(profile.display_name || profile.email || "U").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="truncate text-xl font-bold sm:text-2xl">
                  {profile.display_name || "creator"}
                </h1>
                <CrownBadge plan={profile.plan} showLabel />
              </div>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">{profile.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("dashboard.glance")}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/editor">
                {t("studio.openEditor")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            {profile.plan !== "business" && (
              <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                <Link to="/pricing">{t("common.upgrade")}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <Coins className="h-5 w-5 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">{t("settings.creditsRemaining")}</p>
          <p className="mt-1 text-2xl font-extrabold">{profile.credits.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Credits available across Image · Video · Music
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-xs text-muted-foreground">{t("dashboard.creditsUsed")}</p>
          <p className="mt-1 text-2xl font-extrabold">{used.toLocaleString()}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            of {allocation.toLocaleString()} plan pool
          </p>
        </div>
        <Link
          to="/pricing"
          className="rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary"
        >
          <Crown className="h-5 w-5 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">{t("dashboard.subscription")}</p>
          <p className="mt-1 text-xl font-extrabold">{plan.name}</p>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {plan.name} — Active
          </p>
        </Link>
        <div className="rounded-xl border border-border bg-card p-5">
          <ImageIcon className="h-5 w-5 text-primary" />
          <p className="mt-3 text-xs text-muted-foreground">{t("dashboard.generations")}</p>
          <p className="mt-1 text-sm font-semibold">
            {images} img · {videos} vid · {musicCount} music
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Account & resources
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {resources.map(({ to, icon: Icon, title, body }) => (
            <Link
              key={to + title}
              to={to}
              className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/50"
            >
              <Icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{body}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <History className="h-5 w-5 text-primary" />
            {t("dashboard.recentProjects")}
          </h2>
          <Link to="/history" className="text-sm font-medium text-primary hover:underline">
            {t("home.viewAll")}
          </Link>
        </div>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : gens.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <FolderOpen className="mx-auto h-10 w-10 text-muted-foreground/70" strokeWidth={1.5} />
            <p className="mt-4 text-sm font-semibold text-foreground">No projects yet</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
              Your recent creations will show up here.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {gens.map((g) => {
              const media = g.output_url ? (
                  g.type === "video" ? (
                    <div className="relative aspect-square w-full bg-secondary">
                      <video
                        src={g.output_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
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
              const footer = (
                <div className="p-3">
                  <p className="truncate text-xs font-medium">{g.prompt ?? t("history.untitled")}</p>
                  <p className="mt-1 text-[11px] capitalize text-muted-foreground">
                    {g.type} · {new Date(g.created_at).toLocaleDateString()}
                  </p>
                </div>
              );
              const lock = !historyUnlocked ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1.5 bg-background/55 backdrop-blur-[2px]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm">
                      <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <span className="rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                      Upgrade to unlock
                    </span>
                  </div>
                ) : null;
              if (historyUnlocked) {
                return (
                  <Link
                    key={g.id}
                    to="/history"
                    className="relative overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/40"
                  >
                    {media}
                    {footer}
                  </Link>
                );
              }
              return (
                <div
                  key={g.id}
                  className="relative overflow-hidden rounded-xl border border-border bg-card opacity-90"
                >
                  {media}
                  {lock}
                  {footer}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
