import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { History as HistoryIcon, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { SignedInStudioCards } from "@/components/SignedInStudioCards";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

/** Authenticated home body — fully keyed for i18n. */
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

  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "";

  return (
    <main className="mx-auto max-w-6xl px-4 pt-10 pb-24 md:pb-16">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t("home.welcome")}
            {firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("home.pickStudio")}</p>
        </div>
        <Link
          to="/pricing"
          className="rounded-xl border border-border bg-card px-4 py-3 text-right transition-colors hover:border-primary/40"
        >
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("home.credits")}
          </div>
          <div className="text-2xl font-extrabold text-primary">
            {isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString()}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">{t("home.viewPlans")}</div>
        </Link>
      </div>

      <SignedInStudioCards />

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-4 w-4" /> {t("home.recentHistory")}
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            {t("home.viewAll")}
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            {t("home.noGens")}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
            {recent.map((g) => (
              <Link
                key={g.id}
                to="/history"
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-card"
              >
                {g.output_url && g.type !== "music" ? (
                  g.type === "video" ? (
                    <video src={g.output_url} className="h-full w-full object-cover" muted playsInline />
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
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
