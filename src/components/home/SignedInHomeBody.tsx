import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  History as HistoryIcon,
  Music,
  Image as ImageIcon,
  Video,
  ArrowRight,
  Sparkles,
  Lock,
  Search,
  Circle,
  Aperture,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { useI18n } from "@/lib/i18n";
import type { PlanId } from "@/lib/plans";
import { canAccessMusic, canAccessVideo } from "@/lib/policy";
import { Button } from "@/components/ui/button";
import { CrownBadge } from "@/components/CrownBadge";
import { DiscoveryFeed } from "@/components/discover/DiscoveryFeed";
import { CircleSampleGallery } from "@/components/circle-edit/CircleSampleGallery";

type RecentGen = {
  id: string;
  type: string;
  prompt: string | null;
  output_url: string | null;
  created_at: string;
};

const QUICK_CREATE = [
  { to: "/studio/image" as const, label: "Image", icon: ImageIcon },
  { to: "/studio/video" as const, label: "Video", icon: Video },
  { to: "/studio/music" as const, label: "Music", icon: Music },
  { to: "/studio/image/circle-remove" as const, label: "Circle", icon: Circle },
  { to: "/studio/image/auto-edit" as const, label: "Auto Edit", icon: Sparkles },
  { to: "/studio/image/filters" as const, label: "Filters", icon: Filter },
  { to: "/studio/image/lenses" as const, label: "Lenses", icon: Aperture },
] as const;

export function SignedInHomeBody() {
  const { user, profile } = useAuth();
  const { t } = useI18n();
  const isAdmin = isAdminEmail(profile?.email);
  const [recent, setRecent] = useState<RecentGen[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);

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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="Search"
            onClick={() => setSearchOpen((v) => !v)}
          >
            <Search className="h-4 w-4" />
          </Button>
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
                to={(locked ? "/pricing" : q.to) as "/pricing" | "/studio/image" | "/studio/video" | "/studio/music" | "/studio/image/circle-remove" | "/studio/image/auto-edit" | "/studio/image/filters" | "/studio/image/lenses"}
                className="flex shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-border bg-card px-3 py-2.5 text-center transition-colors hover:border-primary/40 hover:bg-muted/40"
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

      {/* POST-LOGIN ONLY — 25+ Circle sample cards (never on pre-login home) */}
      <CircleSampleGallery />

      <Link
        to="/studio/image/auto-edit"
        className="group mt-5 flex items-center gap-4 overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/15 via-card to-card p-4 shadow-md transition-all duration-300 hover:scale-[1.015] hover:border-primary/70 hover:shadow-[0_8px_32px_hsl(24_95%_53%/0.25)] active:scale-[0.99] sm:p-5"
      >
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-[0_0_24px_hsl(24_95%_53%/0.45)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-[-3deg]">
          A✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold sm:text-lg">Auto Edit</p>
          <p className="text-xs text-muted-foreground sm:text-sm">
            One photo · no prompt · Motio2AI decides
          </p>
        </div>
        <ArrowRight className="h-5 w-5 shrink-0 text-primary transition-transform duration-300 group-hover:translate-x-1" />
      </Link>

      <div className="mt-8">
        <DiscoveryFeed isSignedIn compact forceSearchOpen={searchOpen} />
      </div>

      <section className="mt-12 space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Studios</h2>

        <Link
          to="/studio/image"
          className="relative flex min-h-[128px] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-md transition-transform hover:scale-[1.01] hover:border-primary/40"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/25 via-transparent to-transparent" />
          <div className="relative flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="text-lg font-bold">Image Studio</p>
          </div>
          <p className="relative mt-1 text-xs text-muted-foreground">
            Edit, enhance, remove, restore · recipes from the feed
          </p>
          <span className="relative mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Open <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          <StudioMiniCard
            title="Video Studio"
            desc="Cinematic motion"
            icon={Video}
            locked={!videoOk}
            href={videoOk ? "/studio/video" : "/pricing"}
          />
          <StudioMiniCard
            title="Music Studio"
            desc="Tracks by mood"
            icon={Music}
            locked={!musicOk}
            href={musicOk ? "/studio/music" : "/pricing"}
          />
          <StudioMiniCard
            title="Circle 2edit"
            desc="Mask · remove · add"
            icon={Sparkles}
            locked={false}
            href="/studio/image/circle-info"
          />
          <StudioMiniCard
            title="Auto Edit"
            desc="One photo · AI decides"
            icon={Sparkles}
            locked={false}
            href="/studio/image/auto-edit"
          />
        </div>
      </section>

      <section className="mt-12">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            <HistoryIcon className="h-3.5 w-3.5" /> Your recent
          </h2>
          <Link to="/history" className="text-xs font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">No creations yet</p>
            <Button asChild size="sm" className="mt-3">
              <Link to="/studio/image/auto-edit">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Auto Edit
              </Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {recent.map((g) => (
              <Link
                key={g.id}
                to="/history"
                className="relative aspect-square overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-transform hover:scale-[1.03]"
              >
                {g.output_url && g.type !== "music" ? (
                  g.type === "video" ? (
                    <video
                      src={g.output_url}
                      className="h-full w-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img src={g.output_url} alt="" className="h-full w-full object-cover" />
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-muted">
                    <Music className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className="mt-14 rounded-2xl border border-border bg-card/60 p-5 sm:p-6">
        <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
          How Motio2edit works
        </h2>
        <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-5">
          {[
            ["Understand", "Your idea & inputs"],
            ["Plan", "Recipe & settings"],
            ["Create", "Generate"],
            ["Refine", "Edit & iterate"],
            ["Deliver", "Download & share"],
          ].map(([title, body]) => (
            <li key={title} className="rounded-xl border border-border/80 bg-background/50 p-3">
              <p className="font-bold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}

function StudioMiniCard({
  title,
  desc,
  icon: Icon,
  locked,
  href,
}: {
  title: string;
  desc: string;
  icon: typeof Video;
  locked: boolean;
  href: string;
}) {
  return (
    <Link
      to={href as "/studio/video" | "/studio/music" | "/studio/image/circle-remove" | "/studio/image/auto-edit" | "/studio/image/circle-info" | "/pricing"}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <p className="text-sm font-semibold">{title}</p>
        {locked && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-secondary/80 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground backdrop-blur">
            <Lock className="h-3 w-3" /> Locked
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      <p className="mt-3 text-xs font-semibold text-primary">
        {locked ? "Upgrade to unlock" : "Open"}
      </p>
    </Link>
  );
}
