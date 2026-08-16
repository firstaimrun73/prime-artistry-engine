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
  User,
  Sun,
  Layers,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import { getPlan, CREDIT_COST, type PlanId } from "@/lib/plans";
import { SignedInStudioCards } from "@/components/SignedInStudioCards";
import { SignedInExamples } from "@/components/home/SignedInExamples";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

/** Authenticated home — education + plan + examples + discovery. */
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

  const howSteps = [
    { icon: Upload, titleKey: "edu.step1Title", bodyKey: "edu.step1Body" },
    { icon: MessageSquareText, titleKey: "edu.step2Title", bodyKey: "edu.step2Body" },
    { icon: Wand2, titleKey: "edu.step3Title", bodyKey: "edu.step3Body" },
    { icon: Eye, titleKey: "edu.step4Title", bodyKey: "edu.step4Body" },
    { icon: Download, titleKey: "edu.step5Title", bodyKey: "edu.step5Body" },
  ];

  const autoExamples = [t("edu.ex1"), t("edu.ex2"), t("edu.ex3"), t("edu.ex4"), t("edu.ex5")];

  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 md:pb-16">
      <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("home.welcome")}
              {firstName ? `, ${firstName}` : ""}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {t("home.readyCreate")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("home.workspaceReady")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <CrownBadge plan={planId} showLabel size="md" />
              <span className="rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                {t("home.credits")}: <span className="font-semibold text-foreground">{credits}</span>
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/editor">
                {t("studio.openEditor")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
              <Link to="/studio/image/tools">{t("home.exploreTools")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-2xl border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.yourPlan")}
          </h2>
        </div>
        <h3 className="mt-2 text-xl font-bold">{plan.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("home.planCanDo")} <span className="font-medium text-foreground">{plan.name}</span>:
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
          {t("home.creditCosts")
            .replace("{image}", String(CREDIT_COST.image))
            .replace("{video}", String(CREDIT_COST.video))
            .replace("{music}", String(CREDIT_COST.music))}
          {!plan.video ? ` ${t("home.videoMusicLocked")}` : ""}
        </p>
        {planId !== "business" && (
          <Link to="/pricing" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
            {t("home.viewPlans")}
          </Link>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {t("edu.howTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("edu.howLead")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {howSteps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.titleKey} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-sm font-semibold">{t(s.titleKey)}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{t(s.bodyKey)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Meet Auto Edit — honest about foundation vs full automation */}
      <section className="mt-8 rounded-2xl border border-primary/25 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">{t("edu.autoTitle")}</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{t("edu.autoBody")}</p>
        <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
          Auto Edit is designed to understand your instruction and focus the edit pipeline on the change you asked for,
          while aiming to preserve the rest of the image. Deeper automatic multi-step planning is expanding over time.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">Example upload</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Portrait with dark lighting and a busy background
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">Signals to look for</p>
            <ul className="mt-1 space-y-1 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Sun className="h-3 w-3 text-primary" /> Uneven / low lighting
              </li>
              <li className="flex items-center gap-1.5">
                <User className="h-3 w-3 text-primary" /> Portrait subject
              </li>
              <li className="flex items-center gap-1.5">
                <Layers className="h-3 w-3 text-primary" /> Distracting background
              </li>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-background/70 p-3">
            <p className="text-xs font-semibold text-foreground">Typical directions</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Improve lighting · clean background · enhance facial detail — via clear prompts or Image Tools presets
            </p>
          </div>
        </div>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("edu.examples")}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {autoExamples.map((ex) => (
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
            <Link to="/studio/image/tools">{t("home.exploreTools")}</Link>
          </Button>
        </div>
      </section>

      <SignedInExamples />

      <SignedInStudioCards />

      <section className="mt-8 rounded-xl border border-dashed border-border bg-card/40 p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t("home.comingSoon")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("home.comingSoonBody")}</p>
      </section>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-4 w-4" /> {t("home.recentHistory")}
          </h2>
          <Link to="/history" className="shrink-0 text-xs font-medium text-primary hover:underline">
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
                <Link to="/studio/video">{t("home.createVideo")}</Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link to="/music">{t("home.createMusic")}</Link>
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
