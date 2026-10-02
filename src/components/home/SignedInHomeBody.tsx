import { Link } from "@tanstack/react-router";
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
  Coins,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";
import { RemoveBgHomeCard } from "@/components/remove-bg/RemoveBgHomeCard";
import { VisualDiscoveryGallery } from "@/components/home/VisualDiscoveryGallery";
import { ObserveBuildProtect } from "@/components/home/ObserveBuildProtect";
import { HomePromptBar } from "@/components/home/HomePromptBar";
import { AutoEditHomeCard } from "@/components/home/AutoEditHomeCard";

/** Compact creative tags above Quick Create — colored pills. */
const HOME_CREATE_TAGS: { label: string; className: string }[] = [
  { label: "Portrait", className: "border-rose-400/50 bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  { label: "Product", className: "border-amber-400/50 bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  { label: "Travel", className: "border-sky-400/50 bg-sky-500/10 text-sky-700 dark:text-sky-300" },
  { label: "Food", className: "border-orange-400/50 bg-orange-500/10 text-orange-700 dark:text-orange-300" },
  { label: "Nature", className: "border-emerald-400/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  { label: "Fashion", className: "border-fuchsia-400/50 bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300" },
  { label: "Cinematic", className: "border-violet-400/50 bg-violet-500/10 text-violet-700 dark:text-violet-300" },
  { label: "Abstract", className: "border-cyan-400/50 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" },
];

/** Same fixed width for every quick-create icon — Cropmix → Remove BG → rest */
const QUICK_CREATE = [
  { to: "/studio/cropmix" as const, label: "Cropmix", icon: Crop },
  { to: "/studio/image/remove-bg" as const, label: "Remove BG", icon: Eraser },
  { to: "/editor" as const, label: "Image", icon: ImageIcon },
  { to: "/studio/video" as const, label: "Video", icon: Video },
  { to: "/studio/music" as const, label: "Music", icon: Music },
  { to: "/studio/image/circle-remove" as const, label: "Circle", icon: Circle },
  { to: "/studio/image/auto-edit" as const, label: "Auto Edit", icon: Sparkles },
  { to: "/studio/image/filters" as const, label: "Filters", icon: Filter },
] as const;

export function SignedInHomeBody() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const isAdmin = isAdminEmail(profile?.email);

  const planId = (profile?.plan ?? "free") as PlanId;
  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "";
  // Always show real numeric balance — never infinity as a credit face value.
  const credits = (profile?.credits ?? 0).toLocaleString();
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });
  const isFree = planId === "free" && !isAdmin;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:pt-8 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.welcome")}
            {firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            What will you create?
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CrownBadge plan={planId} showLabel size="md" />
          <span className="rounded-full border border-border/80 bg-card/80 px-2.5 py-0.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
            {credits} credits
          </span>
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

      {/* Pricing strip — always visible so users can see plans & purchase */}
      <section className="mt-4" aria-label="Plans and credits">
        <Link
          to="/pricing"
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-4 py-3 transition hover:border-primary/40 hover:from-primary/15"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Coins className="h-4.5 w-4.5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-tight">
                {isFree ? "Upgrade for more credits & modes" : "Manage plan & buy credits"}
              </p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                Lite $4.99 · Plus $9.99 · Pro $29.99 · AI Studio $55 · Master $110
              </p>
            </div>
          </div>
          <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
            View plans
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </Link>
      </section>

      <section className="mt-5" aria-label="Creative tags">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Use tags to create your photo in seconds
        </p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {HOME_CREATE_TAGS.map((tag) => (
            <Link
              key={tag.label}
              to="/editor"
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur transition hover:opacity-90 ${tag.className}`}
            >
              {tag.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Quick create
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
                className="flex h-auto w-[72px] min-w-[72px] max-w-[72px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1.5 py-3.5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
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

      <CircleSampleGallery />

      <RemoveBgHomeCard />

      <div className="mt-12">
        <VisualDiscoveryGallery />
      </div>

      <ObserveBuildProtect />

      <HomePromptBar />

      <AutoEditHomeCard />
    </main>
  );
}
