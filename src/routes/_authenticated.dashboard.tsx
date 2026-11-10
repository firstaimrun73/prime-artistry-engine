import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { isVisibleInHistory } from "@/lib/history-retention";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import { CreditsUsageBar } from "@/components/dashboard/CreditsUsageBar";
import {
  RecentProjects,
  type DashboardGeneration,
} from "@/components/dashboard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CrownBadge } from "@/components/CrownBadge";
import { resolveAvatarSrc } from "@/lib/avatar-presets";
import { ArrowRight, LayoutGrid, Image as ImageIcon, History } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

type Generation = DashboardGeneration & {
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
  const [gens, setGens] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    void (async () => {
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
  const name = (profile.display_name || "creator").trim() || "creator";
  const initial = (profile.display_name || profile.email || "U").slice(0, 1).toUpperCase();
  const avatarSrc = resolveAvatarSrc(profile.avatar_url, profile.avatar_signed_url, {
    nameOrEmail: profile.display_name || profile.email,
    userId: profile.id,
  });

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 pb-24 md:py-10 md:pb-12">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/profile" className="shrink-0">
            <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2 ring-offset-card">
              <AvatarImage src={avatarSrc} alt={name} />
              <AvatarFallback className="bg-primary/15 font-semibold text-primary">
                {initial}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-lg font-bold tracking-tight">{name}</h1>
              <CrownBadge plan={profile.plan} showLabel />
            </div>
            <p className="text-xs text-muted-foreground">{plan.name} · account overview</p>
          </div>
        </div>
        <Link to="/profile" className="text-sm font-medium text-primary hover:underline">
          Manage account →
        </Link>
      </section>

      <CreditsUsageBar available={profile.credits} used={used} allocation={allocation} />

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Quick actions
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Link
            to="/editor"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
          >
            <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">Image Editor</span>
          </Link>
          <Link
            to="/studio"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
          >
            <LayoutGrid className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">AI+ Tools</span>
          </Link>
          <Link
            to="/history"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
          >
            <History className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">History</span>
          </Link>
          <Link
            to="/studio/image/auto-edit"
            className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/40"
          >
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" />
            <span className="text-sm font-semibold">Maluto AI</span>
          </Link>
        </div>
      </section>

      <RecentProjects gens={gens} loading={loading} historyUnlocked={historyUnlocked} />
    </div>
  );
}
