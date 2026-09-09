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
import { VisualDiscoveryGallery } from "@/components/home/VisualDiscoveryGallery";
import { FilterLensHomeSection } from "@/components/home/FilterLensHomeSection";
import { ExploreLensesSection } from "@/components/home/ExploreLensesSection";
import { ObserveBuildProtect } from "@/components/home/ObserveBuildProtect";
import { HomePromptBar } from "@/components/home/HomePromptBar";
import { MusicStudioGallery } from "@/components/home/MusicStudioGallery";
import { AutoEditHomeCard } from "@/components/home/AutoEditHomeCard";

const QUICK_CREATE = [
  { to: "/editor" as const, label: "Image", icon: ImageIcon },
  { to: "/studio/video" as const, label: "Video", icon: Video },
  { to: "/studio/music" as const, label: "Music", icon: Music },
  { to: "/studio/image/circle-remove" as const, label: "Circle", icon: Circle },
  { to: "/studio/image/auto-edit" as const, label: "Auto Edit", icon: Sparkles },
  { to: "/studio/image/filters" as const, label: "Filters", icon: Filter },
  { to: "/studio/image/lens-editor" as const, label: "Lenses", icon: Aperture },
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
                    | "/editor"
                    | "/studio/video"
                    | "/studio/music"
                    | "/studio/image/circle-remove"
                    | "/studio/image/auto-edit"
                    | "/studio/image/filters"
                    | "/studio/image/lens-editor"
                }
                {...(!locked && q.label === "Circle"
                  ? { search: { mode: "remove" as const, from: "home" as const } }
                  : {})}
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

      <div className="mt-12">
        <VisualDiscoveryGallery />
      </div>

      <MusicStudioGallery />

      <FilterLensHomeSection />

      <ExploreLensesSection />

      <ObserveBuildProtect />

      <HomePromptBar />

      <AutoEditHomeCard />
    </main>
  );
}
