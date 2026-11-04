import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Music,
  Image as ImageIcon,
  Video,
  Sparkles,
  Lock,
  Circle,
  Filter,
  Crop,
  Eraser,
  ArrowRight,
  Wand2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import type { PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo, isPaidPlan } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";
import { RemoveBgHomeCard } from "@/components/remove-bg/RemoveBgHomeCard";
import { VisualDiscoveryGallery } from "@/components/home/VisualDiscoveryGallery";
import { ObserveBuildProtect } from "@/components/home/ObserveBuildProtect";
import { HomePromptBar } from "@/components/home/HomePromptBar";
import { AutoEditHomeCard } from "@/components/home/AutoEditHomeCard";
import { MalutoGuideTour } from "@/components/home/MalutoGuideTour";
import { DirectLinkAd } from "@/components/ads";
import { MalutoHomeHint } from "@/components/home/MalutoHomeHint";

const HOME_CREATE_TAGS: { label: string; prompt: string; className: string }[] = [
  {
    label: "Portrait",
    prompt: "cinematic portrait photo, natural light, sharp focus",
    className: "border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-300",
  },
  {
    label: "Product",
    prompt: "studio product shot, clean background, commercial lighting",
    className: "border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    label: "Travel",
    prompt: "travel photography, scenic landscape, golden hour",
    className: "border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    label: "Food",
    prompt: "food photography, appetizing, soft natural light",
    className: "border-orange-400/50 bg-orange-500/15 text-orange-700 dark:text-orange-300",
  },
];

const HOME_SLOGANS = [
  {
    title: "Bring Your Old Photos Back to Life",
    sub: "Restore faded memories with Maluto AI",
    to: "/studio/image/auto-edit" as const,
    cta: "Explore Maluto AI →",
  },
  {
    title: "Circle 2edit · Cropmix · Remove BG · AI+",
    sub: "Powerful creative tools. Simple workflows.",
    to: "/studio" as const,
    cta: "Explore AI Tools →",
  },
  {
    title: "From idea to download in seconds",
    sub: "Standard · Premium · Ultra AI modes",
    to: "/editor" as const,
    cta: "Open Image Studio →",
  },
  {
    title: "More modes. No watermark.",
    sub: "Upgrade anytime — cancel anytime",
    to: "/pricing" as const,
    cta: "View plans →",
  },
] as const;

const QUICK_CREATE = [
  { to: "/studio/image/auto-edit" as const, label: "Maluto AI", icon: Sparkles },
  { to: "/editor" as const, label: "Image", icon: ImageIcon },
  { to: "/studio/image/circle-remove" as const, label: "Circle", icon: Circle },
  { to: "/studio/image/remove-bg" as const, label: "Remove BG", icon: Eraser },
  { to: "/studio/cropmix" as const, label: "Cropmix", icon: Crop },
  { to: "/studio/image/filters" as const, label: "AI+ Filters", icon: Filter },
  { to: "/studio/video" as const, label: "Video", icon: Video },
  { to: "/studio/music" as const, label: "Music", icon: Music },
] as const;

export function SignedInHomeBody() {
  const { profile } = useAuth();
  const isAdmin = isAdminEmail(profile?.email);

  const planId = (profile?.plan ?? "free") as PlanId;
  const credits = (profile?.credits ?? 0).toLocaleString();
  const showPlanBadge = isAdmin || isPaidPlan(planId);
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });

  const [sloganIdx, setSloganIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => {
      setSloganIdx((i) => (i + 1) % HOME_SLOGANS.length);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  const slogan = HOME_SLOGANS[sloganIdx];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:pt-8 md:max-w-7xl md:pb-12">
      <MalutoHomeHint />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl md:text-3xl">
            What will you create?
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            Image · Video · Music · Maluto AI · AI+ Filters · Circle 2edit
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showPlanBadge ? <CrownBadge plan={planId} showLabel size="md" /> : null}
          <Link
            to="/profile"
            className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card/80 px-2.5 py-0.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition hover:border-primary/40"
          >
            <Wand2 className="h-3 w-3 text-primary" />
            {credits} credits
          </Link>
          {isAdmin ? (
            <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
              Admin
            </span>
          ) : null}
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/profile">Profile</Link>
          </Button>
        </div>
      </div>

      <section className="mt-4" aria-label="Promo">
        <Link
          to={slogan.to}
          className="group relative block overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-orange-500/10"
        >
          <div
            className="absolute inset-0 bg-[linear-gradient(135deg,#ff6b35_0%,#f7931e_25%,#c44569_50%,#6c5ce7_75%,#00cec9_100%)] opacity-90"
            aria-hidden
          />
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.25),transparent_55%)]"
            aria-hidden
          />
          <div className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-5 md:py-5">
            <div className="min-w-0 flex-1 pr-2">
              <p
                key={sloganIdx}
                className="text-sm font-bold leading-snug text-white drop-shadow-sm sm:text-base md:text-lg"
              >
                {slogan.title}
              </p>
              <p className="mt-0.5 text-xs text-white/85 sm:text-sm">{slogan.sub}</p>
              <div className="mt-2 flex gap-1.5" aria-hidden>
                {HOME_SLOGANS.map((_, i) => (
                  <span
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === sloganIdx ? "w-4 bg-white" : "w-1.5 bg-white/40"
                    }`}
                  />
                ))}
              </div>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-orange-600 shadow-sm transition group-hover:bg-white md:text-sm">
              {slogan.cta}
              <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </div>
        </Link>
      </section>

      <AutoEditHomeCard />

      <div className="mt-8 md:mt-10">
        <div className="mb-3 flex items-end justify-between gap-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Trending</p>
            <h2 className="text-base font-extrabold tracking-tight sm:text-lg md:text-xl">
              See what Motio2edit can do
            </h2>
          </div>
        </div>
        <VisualDiscoveryGallery />
      </div>

      <DirectLinkAd placement="home-upper" variant="compact" />

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Quick create · AI+ tools
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] md:flex-wrap md:overflow-visible [&::-webkit-scrollbar]:hidden">
          {QUICK_CREATE.map((q) => {
            const Icon = q.icon;
            const locked =
              (q.label === "Video" && !videoOk) || (q.label === "Music" && !musicOk);
            return (
              <Link
                key={q.label}
                to={
                  (locked ? "/pricing" : q.to) as
                    | "/pricing"
                    | "/studio/cropmix"
                    | "/editor"
                    | "/studio/video"
                    | "/studio/music"
                    | "/studio/image/circle-remove"
                    | "/studio/image/remove-bg"
                    | "/studio/image/auto-edit"
                    | "/studio/image/filters"
                }
                {...(!locked && q.label === "Circle"
                  ? { search: { mode: "remove" as const, from: "home" as const } }
                  : !locked && q.label === "Remove BG"
                    ? { search: { from: "home" as const } }
                    : {})}
                className="flex h-auto w-[72px] min-w-[72px] max-w-[72px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1.5 py-3.5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40 md:w-[88px] md:min-w-[88px] md:max-w-[88px]"
              >
                <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                  {locked && (
                    <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                <span className="w-full truncate text-[11px] font-semibold leading-tight">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5" aria-label="Creative tags">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Use tags to create your photo in seconds
        </p>
        <div className="flex flex-wrap gap-2">
          {HOME_CREATE_TAGS.map((tag) => (
            <Link
              key={tag.label}
              to="/editor"
              search={{ prompt: tag.prompt } as never}
              className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:opacity-90 ${tag.className}`}
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-8 md:mt-12">
        <CircleSampleGallery />
        <RemoveBgHomeCard />
      </div>

      <DirectLinkAd placement="home-mid" />

      <ObserveBuildProtect />

      <HomePromptBar />

      <MalutoGuideTour />
    </main>
  );
}
