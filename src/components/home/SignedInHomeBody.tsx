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
import { WalkingRefsStrip } from "@/components/home/WalkingRefsStrip";

const HOME_CREATE_TAGS: { label: string; prompt: string; className: string }[] = [
  { label: "Portrait", prompt: "cinematic portrait photo, natural light, sharp focus", className: "border-rose-400/50 bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  { label: "Product", prompt: "studio product shot, clean background, commercial lighting", className: "border-amber-400/50 bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  { label: "Travel", prompt: "travel photography, scenic landscape, golden hour", className: "border-sky-400/50 bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  { label: "Food", prompt: "food photography, appetizing, soft natural light", className: "border-orange-400/50 bg-orange-500/15 text-orange-700 dark:text-orange-300" },
];

const HOME_SLOGANS = [
  { title: "Try a plan that fits you", sub: "Lite · Plus · Pro · AI Studio · Master" },
  { title: "Use Motio2edit AI for best edits", sub: "Image · Video · Music in one place" },
  { title: "Circle 2edit · Cropmix · Remove BG", sub: "Pro tools, simple credits" },
  { title: "From idea to download in seconds", sub: "Standard · Premium · Ultra AI modes" },
  { title: "More credits. More modes. No watermark.", sub: "Upgrade anytime — cancel anytime" },
] as const;

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
  const credits = (profile?.credits ?? 0).toLocaleString();
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });
  const [sloganIdx, setSloganIdx] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setSloganIdx((i) => (i + 1) % HOME_SLOGANS.length), 3800);
    return () => window.clearInterval(id);
  }, []);
  const slogan = HOME_SLOGANS[sloganIdx];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-5 pb-24 sm:pt-8 md:pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("home.welcome")}{firstName ? `, ${firstName}` : ""}
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">What will you create?</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CrownBadge plan={planId} showLabel size="md" />
          <span className="rounded-full border border-border/80 bg-card/80 px-2.5 py-0.5 text-xs text-muted-foreground shadow-sm backdrop-blur">{credits} credits</span>
          {isAdmin ? <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">Admin</span> : null}
          <Button asChild variant="outline" size="sm" className="rounded-full"><Link to="/profile">Profile</Link></Button>
        </div>
      </div>

      <section className="mt-4" aria-label="Promo">
        <Link to="/pricing" className="group relative block overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-orange-500/10">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,#ff6b35_0%,#f7931e_25%,#c44569_50%,#6c5ce7_75%,#00cec9_100%)] opacity-90" aria-hidden />
          <div className="relative flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
            <div className="min-w-0 flex-1">
              <p key={sloganIdx} className="text-sm font-bold leading-snug text-white drop-shadow-sm sm:text-base">{slogan.title}</p>
              <p className="mt-0.5 truncate text-xs text-white/85">{slogan.sub}</p>
            </div>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/95 px-3 py-1.5 text-xs font-bold text-orange-600 shadow-sm">View plans <ArrowRight className="h-3.5 w-3.5" /></span>
          </div>
        </Link>
      </section>

      <section className="mt-5" aria-label="Creative tags">
        <p className="mb-2 text-xs font-medium text-muted-foreground">Use tags to create your photo in seconds</p>
        <div className="flex flex-wrap gap-2">
          {HOME_CREATE_TAGS.map((tag) => (
            <Link key={tag.label} to="/editor" search={{ prompt: tag.prompt } as never} className={`shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold shadow-sm ${tag.className}`}>{tag.label}</Link>
          ))}
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Quick create</h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_CREATE.map((q) => {
            const Icon = q.icon;
            const locked = (q.label === "Video" && !videoOk) || (q.label === "Music" && !musicOk);
            return (
              <Link key={q.label} to={(locked ? "/pricing" : q.to) as "/pricing" | "/studio/cropmix" | "/editor" | "/studio/video" | "/studio/music" | "/studio/image/circle-remove" | "/studio/image/remove-bg" | "/studio/image/auto-edit" | "/studio/image/filters"} className="flex h-auto w-[72px] min-w-[72px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-1.5 py-3.5 text-center hover:border-primary/40">
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" />{locked && <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-muted-foreground" />}</span>
                <span className="w-full truncate text-[11px] font-semibold">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <CircleSampleGallery />
      <RemoveBgHomeCard />
      <div className="mt-12"><VisualDiscoveryGallery /></div>
      <ObserveBuildProtect />
      <WalkingRefsStrip />
    </main>
  );
}
