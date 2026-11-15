import type { ReactNode } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, Lock, Frame, Sparkles, Crop, Eraser, Circle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { CreditSpendHint } from "@/components/ads";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit" },
      {
        name: "description",
        content: "Unified Image, Video and Music generation workspace.",
      },
      { property: "og:title", content: "Studio — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // Child product routes under /studio/* render via Outlet (existing implementations).
  if (pathname !== "/studio") return <Outlet />;
  return <UnifiedStudio />;
}

function UnifiedStudio() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:min-h-0 md:h-[100dvh] md:max-h-[100dvh] md:overflow-hidden">
      <Header />
      <main className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-4 sm:px-4 sm:pb-6 md:max-w-6xl md:overflow-y-auto lg:max-w-7xl">
        {/* Ambient glass backdrop */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-16 top-40 h-72 w-72 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="absolute bottom-20 left-1/3 h-48 w-48 rounded-full bg-sky-500/10 blur-3xl" />
        </div>

        <div className="mb-4 shrink-0 text-center sm:mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Creative workspace
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            Studio
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            One workspace · Image · Video · Music
          </p>
        </div>

        {/* Mode switch — primary navigation inside Studio */}
        <div className="mb-4 flex shrink-0 justify-center">
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-2xl border border-white/20 bg-white/10 p-1.5 shadow-lg backdrop-blur-xl",
              "dark:border-white/10 dark:bg-white/5",
            )}
            role="tablist"
            aria-label="Studio mode"
          >
            <ModeTab to="/editor" label="Image" icon={<ImageIcon className="h-4 w-4" />} active />
            <ModeTab
              to={videoOk ? "/studio/video" : "/pricing"}
              label="Video"
              icon={<Video className="h-4 w-4" />}
              locked={!videoOk}
            />
            <ModeTab
              to={musicOk ? "/music" : "/pricing"}
              label="Music"
              icon={<Music className="h-4 w-4" />}
              locked={!musicOk}
            />
          </div>
        </div>

        <CreditSpendHint
          className="mb-4 shrink-0"
          costLabel="Generations spend credits from your balance"
        />

        {/* Image mode tools — kept as image tools, not separate top-level nav */}
        <section
          className={cn(
            "mb-5 rounded-3xl border border-white/15 bg-white/8 p-4 shadow-xl backdrop-blur-xl",
            "dark:border-white/10 dark:bg-white/5 sm:p-5",
          )}
        >
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <ImageIcon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Image</h2>
              <p className="text-[11px] text-muted-foreground">Generate and edit with real tools</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 md:gap-3">
            <ToolCard
              to="/editor"
              title="Generate & Edit"
              subtitle="Prompt · enhance · restyle"
              icon={<Sparkles className="h-5 w-5" />}
              accent="from-primary/40"
            />
            <ToolCard
              to="/studio/image/circle-remove"
              search={{ mode: "remove" as const, from: "studio" as const }}
              title="Circle 2edit"
              subtitle="Remove · Add"
              icon={<Circle className="h-5 w-5 text-[#7B6FE0]" />}
              accent="from-[#7B6FE0]/30"
            />
            <ToolCard
              to="/studio/image/remove-bg"
              title="Background"
              subtitle="Remove background"
              icon={<Eraser className="h-5 w-5" />}
              accent="from-emerald-500/30"
            />
            <ToolCard
              to="/studio/cropmix"
              title="Crop"
              subtitle="Crop & compose"
              icon={<Crop className="h-5 w-5" />}
              accent="from-amber-500/30"
            />
            <ToolCard
              to="/studio/frames"
              title="Frames"
              subtitle="Frame · Glass"
              icon={<Frame className="h-5 w-5" />}
              accent="from-slate-400/30"
            />
            <ToolCard
              to="/studio/image/auto-edit"
              title="Maluto AI"
              subtitle="Restore · auto-edit"
              icon={<Sparkles className="h-5 w-5 text-orange-500" />}
              accent="from-orange-500/30"
            />
          </div>
        </section>

        {/* Video + Music quick entry */}
        <div className="grid gap-3 sm:grid-cols-2">
          <ModeCard
            to={videoOk ? "/studio/video" : "/pricing"}
            title="Video"
            subtitle={videoOk ? "Prompt-to-video generation" : "Requires a paid plan"}
            icon={<Video className="h-6 w-6" />}
            locked={!videoOk}
            gradient="from-rose-500/25 via-transparent to-transparent"
          />
          <ModeCard
            to={musicOk ? "/music" : "/pricing"}
            title="Music"
            subtitle={musicOk ? "Prompt-to-music generation" : "Requires a paid plan"}
            icon={<Music className="h-6 w-6" />}
            locked={!musicOk}
            gradient="from-fuchsia-500/25 via-transparent to-transparent"
          />
        </div>
      </main>
    </div>
  );
}

function ModeTab({
  to,
  label,
  icon,
  active,
  locked,
}: {
  to: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
  locked?: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-all",
        active
          ? "bg-background/90 text-foreground shadow-md dark:bg-background/80"
          : "text-muted-foreground hover:bg-white/10 hover:text-foreground",
        locked && "opacity-70",
      )}
      role="tab"
      aria-selected={!!active}
    >
      {icon}
      {label}
      {locked ? <Lock className="h-3 w-3 opacity-70" /> : null}
    </Link>
  );
}

function ToolCard({
  to,
  search,
  title,
  subtitle,
  icon,
  accent,
}: {
  to: string;
  search?: Record<string, string>;
  title: string;
  subtitle: string;
  icon: ReactNode;
  accent: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(
        "group relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-3.5 shadow-md backdrop-blur-md transition",
        "hover:border-white/25 hover:bg-white/15 hover:shadow-lg dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80", accent, "to-transparent")} />
      <div className="relative text-foreground">{icon}</div>
      <div className="relative">
        <h3 className="text-sm font-bold tracking-tight">{title}</h3>
        <p className="text-[10px] text-muted-foreground sm:text-[11px]">{subtitle}</p>
      </div>
    </Link>
  );
}

function ModeCard({
  to,
  title,
  subtitle,
  icon,
  locked,
  gradient,
}: {
  to: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  locked?: boolean;
  gradient: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "relative flex min-h-[7.5rem] flex-col justify-between overflow-hidden rounded-3xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur-xl transition",
        "hover:border-white/25 hover:bg-white/15 dark:border-white/10 dark:bg-white/5",
        locked && "opacity-90",
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="relative inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/70 text-primary shadow-sm">
        {icon}
      </div>
      <div className="relative mt-3">
        <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {locked ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-3xl bg-background/50 backdrop-blur-[2px]">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground">Requires paid plan</span>
        </div>
      ) : null}
    </Link>
  );
}
