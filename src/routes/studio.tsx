import type { ReactNode } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Header } from "@/components/Header";
import { Sparkles, Lock, Frame, Eraser, Crop, Filter, Circle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessMalutoAI } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { CreditSpendHint } from "@/components/ads";

export const Route = createFileRoute("/studio")({
  head: () => ({
    meta: [
      { title: "AI+ Tools — Motio2edit" },
      {
        name: "description",
        content: "Circle 2edit, Background Remover, Cropmix, Filters, Frames, Lenses and more.",
      },
      { property: "og:title", content: "AI+ Tools — Motio2edit" },
      { name: "robots", content: "noindex, follow" },
    ],
  }),
  component: StudioLayout,
});

function StudioLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname !== "/studio") return <Outlet />;
  return <StudioHub />;
}

/**
 * AI+ Tools hub — editing utilities only.
 * Image / Video / Music generation lives in the unified Motion2AI workspace.
 */
function StudioHub() {
  const { profile } = useAuth();
  const admin = isAdminEmail(profile?.email);
  const malutoOk = canAccessMalutoAI({
    plan: profile?.plan,
    email: profile?.email,
    isAdmin: admin,
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:min-h-0 md:h-[100dvh] md:max-h-[100dvh] md:overflow-hidden">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 pb-[max(5.5rem,env(safe-area-inset-bottom))] pt-3 sm:px-4 sm:pb-6 md:max-w-6xl md:overflow-y-auto lg:max-w-7xl">
        <div className="mb-3 shrink-0 text-center sm:mb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            AI+ Tools
          </p>
          <h1 className="mt-0.5 text-xl font-extrabold tracking-tight sm:text-2xl">
            Edit & enhance
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Generate Image, Video & Music in{" "}
            <Link to="/motion2ai" search={{ mode: "image" as const }} className="font-semibold text-primary hover:underline">
              Motion2AI
            </Link>
          </p>
        </div>

        <CreditSpendHint
          className="mb-3 shrink-0"
          costLabel="Edits spend credits from your balance"
        />

        {/* Single CTA into unified workspace */}
        <Link
          to="/motion2ai"
          search={{ mode: "image" as const }}
          className="group relative mb-3 flex shrink-0 items-center gap-3 overflow-hidden rounded-2xl border border-primary/30 bg-card/80 p-4 shadow-sm backdrop-blur-md transition hover:border-primary/50 hover:shadow-md sm:rounded-3xl"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-primary/20 via-orange-500/10 to-transparent" />
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Sparkles className="h-6 w-6" />
          </span>
          <div className="relative min-w-0 flex-1">
            <p className="text-base font-extrabold tracking-tight">Motion2AI</p>
            <p className="text-[11px] text-muted-foreground">
              One workspace · Image · Video · Music
            </p>
          </div>
          <span className="relative text-xs font-bold text-primary">Open →</span>
        </Link>

        <div
          className={cn(
            "grid min-h-0 flex-1 gap-2.5 sm:gap-3",
            "grid-cols-2 auto-rows-[minmax(8.5rem,1fr)]",
            "md:grid-cols-3 md:auto-rows-[minmax(10rem,13rem)] md:content-start md:gap-4",
          )}
        >
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
            to="/studio/image/remove-bg"
            search={{ from: "studio" as const }}
            title="Remove BG"
            subtitle="Cutout · clean edges"
            gradient="from-emerald-500/25 via-transparent to-transparent"
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3 sm:p-3.5">
                <Eraser className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to="/studio/cropmix"
            title="Cropmix"
            subtitle="Crop · compose"
            gradient="from-amber-500/25 via-transparent to-transparent"
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3 sm:p-3.5">
                <Crop className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to="/studio/image/filters"
            title="Filters"
            subtitle="Looks · grade"
            gradient="from-sky-500/25 via-transparent to-transparent"
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3 sm:p-3.5">
                <Filter className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to="/studio/frames"
            title="Frames"
            subtitle="Frame · Glass"
            gradient="from-slate-400/30 via-zinc-200/10 to-transparent"
            icon={
              <span className="inline-flex rounded-2xl border border-slate-400/40 bg-background/80 p-3 sm:p-3.5">
                <Frame className="h-6 w-6 text-slate-600 dark:text-slate-300 sm:h-7 sm:w-7" />
              </span>
            }
          />

          <StudioTile
            to={malutoOk ? "/studio/image/auto-edit" : "/pricing"}
            title="Maluto AI"
            subtitle={malutoOk ? "Restore · revive" : "Requires a paid plan"}
            gradient="from-orange-500/30 via-transparent to-transparent"
            locked={!malutoOk}
            icon={
              <span className="inline-flex rounded-2xl border border-border bg-background/80 p-3 sm:p-3.5">
                <Sparkles className="h-6 w-6 text-primary sm:h-7 sm:w-7" />
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
  className,
}: {
  to: string;
  search?: Record<string, string>;
  title: ReactNode;
  subtitle: string;
  icon: ReactNode;
  gradient: string;
  borderClass?: string;
  locked?: boolean;
  className?: string;
}) {
  return (
    <Link
      to={to}
      search={search as never}
      className={cn(
        "group relative flex min-h-0 flex-col justify-between overflow-hidden rounded-2xl border bg-card/80 p-3.5 shadow-sm backdrop-blur-md transition-transform active:scale-[0.98] sm:rounded-3xl sm:p-4",
        "border-border/80",
        borderClass,
        className,
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", gradient)} />
      <div className="relative">{icon}</div>
      <div className="relative mt-auto">
        <h2 className="text-base font-extrabold tracking-tight sm:text-lg">{title}</h2>
        <p className="mt-0.5 text-[10px] text-muted-foreground sm:text-[11px]">{subtitle}</p>
      </div>
      {locked ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 rounded-2xl bg-background/55 backdrop-blur-[2px] sm:rounded-3xl">
          <Lock className="h-5 w-5 text-primary" />
          <span className="text-[11px] font-semibold text-muted-foreground">Requires paid plan</span>
        </div>
      ) : null}
    </Link>
  );
}

function CircleMetaRing() {
  return (
    <span
      className="relative grid h-12 w-12 place-items-center rounded-2xl border border-[#7B6FE0]/45 bg-white/90 shadow-lg dark:bg-[#22252F] sm:h-14 sm:w-14"
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
          r="15"
          fill="none"
          stroke="url(#studioMetaRing)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeDasharray="28 60"
          className="origin-center motion-safe:animate-[spin_5.5s_linear_infinite]"
        />
        <circle
          cx="20"
          cy="20"
          r="10"
          fill="none"
          stroke="#7B6FE0"
          strokeWidth="1.5"
          opacity="0.75"
          strokeDasharray="18 40"
          className="origin-center motion-safe:animate-[spin_9s_linear_infinite_reverse]"
        />
        <circle
          cx="20"
          cy="20"
          r="3.4"
          fill="#7B6FE0"
          className="motion-safe:animate-[c2ePulse_2.4s_ease-in-out_infinite]"
        />
      </svg>
      <style>{`
        @keyframes c2ePulse {
          0%, 100% { opacity: 0.85; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>
    </span>
  );
}
