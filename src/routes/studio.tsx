import type { ReactNode } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Image as ImageIcon, Video, Music, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "Studio — Motio2edit by Motion2AI" },
      { name: "description", content: "Image, Video, Music, and Circle 2edit studios in one hub." },
      { property: "og:title", content: "Studio — Motio2edit by Motion2AI" },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioHub />;
}

/** Windows-style fixed studio picker — no page scroll, glass tiles. */
function StudioHub() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const plan = profile?.plan;
  const videoOk = canAccessVideo({ plan, email: profile?.email, isAdmin: admin });
  const musicOk = canAccessMusic({ plan, email: profile?.email, isAdmin: admin });

  return (
    <div className="flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-background">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-6">
        <div className="mb-3 shrink-0 text-center sm:mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Studio
          </p>
          <h1 className="mt-1 text-xl font-extrabold tracking-tight sm:text-2xl">Choose a studio</h1>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-2 sm:gap-3">
          <StudioTile
            to="/editor"
            title="Image"
            subtitle="Generate · enhance"
            gradient="from-primary/35 via-primary/10 to-transparent"
            icon={
              <span className="inline-flex rounded-2xl bg-primary p-3 text-primary-foreground shadow-lg">
                <ImageIcon className="h-6 w-6 sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to="/studio/image/circle-remove"
            search={{ mode: "remove" as const, from: "studio" as const }}
            title={
              <>
                <span className="text-[#7B6FE0]">Circle</span>
                <span className="font-medium text-foreground/90"> 2edit</span>
              </>
            }
            subtitle="Remove · Add"
            gradient="from-[#7B6FE0]/25 via-transparent to-transparent"
            borderClass="border-[#7B6FE0]/35 dark:border-[#7B6FE0]/40"
            icon={<CircleMetaRing />}
          />

          <StudioTile
            to={videoOk ? "/studio/video" : "/pricing"}
            title="Video"
            subtitle={videoOk ? "Cinematic motion" : "Upgrade to unlock"}
            gradient="from-rose-500/30 via-transparent to-transparent"
            locked={!videoOk}
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3">
                <Video className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to={musicOk ? "/studio/music" : "/pricing"}
            title="Music"
            subtitle={musicOk ? "Prompt-to-music" : "Upgrade to unlock"}
            gradient="from-fuchsia-500/30 via-transparent to-transparent"
            locked={!musicOk}
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3">
                <Music className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </span>
            }
          />
        </div>
      </main>
    </div>
  );
}

function StudioTile({
  to,
  search,
  title,
  subtitle,
  icon,
  gradient,
  borderClass,
  locked,
}: {
  to: string;
  search?: Record<string, string>;
  title: ReactNode;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  borderClass?: string;
  locked?: boolean;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className={cn(
        "group relative flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl border bg-card/80 p-4 shadow-sm backdrop-blur-md transition-transform active:scale-[0.98] sm:rounded-3xl sm:p-5",
        "border-border/80",
        borderClass,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="relative">{icon}</div>
      <div className="relative mt-auto">
        <h2 className="text-lg font-extrabold tracking-tight sm:text-xl">{title}</h2>
        <p className="mt-0.5 text-[11px] text-muted-foreground sm:text-xs">{subtitle}</p>
      </div>
      {locked ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-2xl bg-background/55 backdrop-blur-[2px] sm:rounded-3xl">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground">Locked on Free</span>
        </div>
      ) : null}
    </Link>
  );
}

/** Meta-style concentric ring mark in Circle 2edit purple. */
function CircleMetaRing() {
  return (
    <span
      className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#7B6FE0]/45 bg-white/80 shadow-lg dark:bg-[#22252F] sm:h-14 sm:w-14"
      aria-hidden
    >
      <svg viewBox="0 0 40 40" className="h-9 w-9 overflow-visible sm:h-10 sm:w-10">
        <defs>
          <linearGradient id="studioMetaRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A8A0F0" />
            <stop offset="50%" stopColor="#7B6FE0" />
            <stop offset="100%" stopColor="#C8C4E8" />
          </linearGradient>
        </defs>
        <circle
          cx="20"
          cy="20"
          r="14"
          fill="none"
          stroke="url(#studioMetaRing)"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="origin-center motion-safe:animate-[spin_10s_linear_infinite]"
        />
        <circle cx="20" cy="20" r="8.5" fill="none" stroke="#7B6FE0" strokeWidth="1.6" opacity="0.85" />
        <circle cx="20" cy="20" r="3.2" fill="#7B6FE0" opacity="0.9" />
      </svg>
    </span>
  );
}
