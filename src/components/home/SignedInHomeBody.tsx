import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History as HistoryIcon,
  Music,
  Upload,
  MessageSquareText,
  Wand2,
  Eye,
  Download,
  Sparkles,
  Crown,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { getPlan, CREDIT_COST, type PlanId } from "@/lib/plans";
import { SignedInStudioCards } from "@/components/SignedInStudioCards";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

const HOW_STEPS = [
  { icon: Upload, title: "Upload your image", body: "Open the Image Editor and add the photo you want to improve." },
  { icon: MessageSquareText, title: "Describe the change", body: "Write what you want — remove an object, change clothing, restore detail." },
  { icon: Wand2, title: "Auto Edit or a tool", body: "Use Auto Edit for natural language, or pick a preset from Image Studio / Image Tools." },
  { icon: Eye, title: "Review the result", body: "Check the output. Refine with another prompt if needed." },
  { icon: Download, title: "Download", body: "Save your edited image. Plan rules for watermarks still apply." },
];

const AUTO_EXAMPLES = [
  "Remove the person behind me.",
  "Change my shirt to black.",
  "Make the lighting brighter.",
  "Remove the object on the table.",
  "Restore this old photograph.",
];

/** Authenticated home — education + plan context + discovery. */
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

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 md:pb-16">
      {/* Welcome */}
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.welcome")}
            </p>
            <h1 className="mt-1 truncate text-2xl font-extrabold tracking-tight sm:text-3xl">
              {firstName || "creator"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Your creative workspace is ready.</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CrownBadge plan={planId} showLabel size="md" />
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("home.credits")}: <span className="font-semibold text-foreground">{credits}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/editor">
                {t("studio.openEditor")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/studio/image/tools">Explore Image Tools</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Your plan */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Your plan</h2>
        </div>
        <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          What you can do with <span className="font-medium text-foreground">{plan.name}</span> right now:
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {plan.features.slice(0, 6).map((f) => (
            <li key={f} className="flex gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Image edits cost {CREDIT_COST.image} credits
          {plan.video ? ` · Video ${CREDIT_COST.video} · Music ${CREDIT_COST.music}` : " · Video and music require Lite or higher"}.
        </p>
        {planId !== "business" && (
          <Link to="/pricing" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
            {t("home.viewPlans")}
          </Link>
        )}
      </section>

      {/* How image editing works */}
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">How image editing works</h2>
        <p className="mt-1 text-sm text-muted-foreground">Five short steps from upload to download.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {HOW_STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold">{s.title}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{s.body}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Auto Edit education */}
      <section className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Auto Edit</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Describe what you want in plain language. Motio2edit focuses on the requested change and aims to preserve
          parts of the image you did not ask to modify. Results depend on your prompt clarity and source photo quality.
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Example prompts</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {AUTO_EXAMPLES.map((ex) => (
            <li
              key={ex}
              className="rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-foreground"
            >
              “{ex}”
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button asChild size="sm">
            <Link to="/editor">{t("studio.openEditor")}</Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/studio/image/tools">Browse all image tools</Link>
          </Button>
        </div>
      </section>

      <SignedInStudioCards />

      {/* Coming soon */}
      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Coming soon</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Advanced Prompt Intelligence and deeper Auto Edit analysis are planned for a future release. The current
          editor remains the workspace for all live image and video tools.
        </p>
      </section>

      {/* Recent */}
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
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
            <p className="text-sm text-muted-foreground">{t("home.noGens")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button asChild size="sm">
                <Link to="/editor">{t("studio.openEditor")}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/studio/image">{t("studio.image")}</Link>
              </Button>
            </div>
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
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
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
