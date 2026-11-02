import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getPlan, PLAN_CREDITS } from "@/lib/plans";
import { isVisibleInHistory } from "@/lib/history-retention";
import { isPaidPlan } from "@/lib/policy";
import { isAdminEmail } from "@/lib/admin-config";
import {
  WelcomeHero,
  CreditsPlanSection,
  StudioShortcuts,
  RecentProjects,
  QuickResources,
  type DashboardGeneration,
} from "@/components/dashboard";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

/** Same visibility fields as History page — isVisibleInHistory needs the full row. */
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
  const showUpgrade = profile.plan !== "business" && profile.plan !== "ultra";

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 pb-24 md:py-10 md:pb-12">
      <WelcomeHero
        displayName={profile.display_name}
        email={profile.email}
        avatarUrl={profile.avatar_signed_url}
        plan={profile.plan}
        userId={user?.id ?? profile.email ?? "guest"}
        showUpgrade={showUpgrade}
      />

      <CreditsPlanSection
        credits={profile.credits}
        used={used}
        allocation={allocation}
        plan={plan}
        images={images}
        videos={videos}
        musicCount={musicCount}
        showUpgrade={showUpgrade}
      />

      <StudioShortcuts />

      <RecentProjects
        gens={gens}
        loading={loading}
        historyUnlocked={historyUnlocked}
      />

      <QuickResources />
    </div>
  );
}
