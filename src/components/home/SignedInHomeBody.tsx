import { Link } from "@tanstack/react-router";
import {
  Music,
  Image as ImageIcon,
  Video,
  ArrowRight,
  Sparkles,
  Lock,
  Circle,
  Aperture,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";
import { ImagineGallery } from "@/components/home/ImagineGallery";
import { VideoStudioGallery } from "@/components/home/VideoStudioGallery";
import { MusicStudioGallery } from "@/components/home/MusicStudioGallery";
import { FilterLensHomeSection } from "@/components/home/FilterLensHomeSection";

const QUICK_CREATE = [
  { to: "/studio/image" as const, label: "Image", icon: ImageIcon },
  { to: "/studio/video" as const, label: "Video", icon: Video },
  { to: "/studio/music" as const, label: "Music", icon: Music },
  { to: "/studio/image/circle-remove" as const, label: "Circle", icon: Circle },
  { to: "/studio/image/auto-edit" as const, label: "Auto Edit", icon: Sparkles },
  { to: "/studio/image/filters" as const, label: "Filters", icon: Filter },
  { to: "/studio/image/lenses" as const, label: "Lenses", icon: Aperture },
] as const;

const AUTO_EDIT_FLOW = [
  "Input",
  "AI analysis",
  "One click",
  "Editing",
  "Output",
] as const;

export function SignedInHomeBody() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const isAdmin = isAdminEmail(profile?.email);

  const planId = (profile?.plan ?? "free") as PlanId;
  const firstName = profile?.display_name ? profile.display_name.split(" ")[0] : "";
  const credits = isAdmin ? "∞" : (profile?.credits ?? 0).toLocaleString();
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });

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
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link to="/profile">Profile</Link>
          </Button>
        </div>
      </div>

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Quick create
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
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
                    | "/studio/image"
                    | "/studio/video"
                    | "/studio/music"
                    | "/studio/image/circle-remove"
                    | "/studio/image/auto-edit"
                    | "/studio/image/filters"
                    | "/studio/image/lenses"
                }
                className="flex min-w-[72px] shrink-0 flex-col items-center gap-2 rounded-2xl border border-border bg-card px-4 py-3.5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                  {locked && (
                    <Lock className="absolute -right-1 -top-1 h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </span>
                <span className="text-[11px] font-semibold">{q.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      <CircleSampleGallery />

      <section className="mt-12 space-y-6" data-motion2ai-creation>
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-[20px] font-extrabold tracking-tight sm:text-[22px]">
            <span>
              Motion<span className="text-primary">2</span>AI Creation
            </span>
            <svg
              aria-hidden
              viewBox="0 0 24 24"
              className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6"
              fill="currentColor"
            >
              <path d="M12 2l1.2 6.3L19.5 9 13.2 10.7 12 17l-1.2-6.3L4.5 9l6.3-.7L12 2z" />
              <path
                d="M18.5 14l.6 2.6 2.4.6-2.4.6-.6 2.6-.6-2.6-2.4-.6 2.4-.6.6-2.6z"
                opacity="0.85"
              />
              <path
                d="M5.2 15.5l.45 1.9 1.8.45-1.8.45-.45 1.9-.45-1.9-1.8-.45 1.8-.45.45-1.9z"
                opacity="0.7"
              />
            </svg>
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Image, video, and music samples from Motio2edit.
          </p>
        </div>
        <ImagineGallery />
        <VideoStudioGallery />
        <MusicStudioGallery />
      </section>

      <FilterLensHomeSection />

      <Link
        to="/studio/image/auto-edit"
        className="group relative mt-8 block overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-md transition-all duration-300 hover:scale-[1.01] hover:border-primary/70 hover:shadow-[0_8px_32px_hsl(24_95%_53%/0.22)] active:scale-[0.99] sm:p-5"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-[0_0_20px_hsl(24_95%_53%/0.4)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg] sm:h-14 sm:w-14 sm:text-lg">
            A✦
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold sm:text-lg">Auto Edit</p>
            <p className="text-xs text-muted-foreground sm:text-sm">
              One photo · no prompt · Motio2AI decides
            </p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {AUTO_EDIT_FLOW.map((step, i) => (
            <div key={step} className="flex items-center gap-1.5 sm:gap-2">
              <span className="rounded-full border border-primary/30 bg-background/70 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-foreground/90 shadow-sm backdrop-blur-sm sm:text-[11px]">
                {step}
              </span>
              {i < AUTO_EDIT_FLOW.length - 1 && (
                <span
                  className="hidden h-px w-3 border-t border-dashed border-primary/40 sm:block sm:w-4"
                  aria-hidden
                />
              )}
              {i < AUTO_EDIT_FLOW.length - 1 && (
                <span className="text-[10px] text-primary/50 sm:hidden" aria-hidden>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
      </Link>
    </main>
  );
}
