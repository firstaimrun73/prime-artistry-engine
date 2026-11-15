/**
 * Unified Motion2AI creative workspace shell.
 * Image / Video / Music modes in one surface. Reuses production editors.
 * Pre-login exploration is allowed; Generate remains auth-gated by existing paths.
 */
import { Link, useNavigate } from "@tanstack/react-router";
import { Image as ImageIcon, Video, Music, Coins, Sparkles, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { canAccessVideo, canAccessMusic } from "@/lib/policy";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { PlanId } from "@/lib/plans";

export type Motion2AIMode = "image" | "video" | "music";

type Props = {
  /** Active mode highlight */
  activeMode?: Motion2AIMode;
  /** Compact header for embedding above existing editors */
  compact?: boolean;
  className?: string;
};

const MODES: {
  id: Motion2AIMode;
  label: string;
  icon: typeof ImageIcon;
  href: string;
  description: string;
}[] = [
  {
    id: "image",
    label: "Image",
    icon: ImageIcon,
    href: "/editor",
    description: "Generate · enhance · restyle",
  },
  {
    id: "video",
    label: "Video",
    icon: Video,
    href: "/studio/video",
    description: "Text & image to motion",
  },
  {
    id: "music",
    label: "Music",
    icon: Music,
    href: "/studio/music",
    description: "Prompt to track",
  },
];

export function Motion2AIWorkspaceHeader({ activeMode = "image", compact, className }: Props) {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(profile?.email);
  const planId = (profile?.plan ?? "free") as PlanId;
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });
  const credits = profile?.credits ?? 0;

  const openMode = (mode: Motion2AIMode, href: string, locked: boolean) => {
    if (locked) {
      navigate({ to: "/pricing" });
      return;
    }
    try {
      sessionStorage.setItem("motio2edit-mode", mode === "music" ? "image" : mode);
      if (mode === "image") {
        sessionStorage.setItem("motio2edit-mode", "image");
      }
    } catch {
      /* ignore */
    }
    if (!user) {
      navigate({
        to: "/auth",
        search: { redirect: href, mode: "signin" },
      });
      return;
    }
    navigate({ to: href as "/editor" | "/studio/video" | "/studio/music" });
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-border/60 bg-background/75 backdrop-blur-xl",
        "supports-[backdrop-filter]:bg-background/60",
        className,
      )}
    >
      <div
        className={cn(
          "mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-3 sm:px-4",
          compact ? "py-2" : "py-2.5 sm:py-3",
        )}
      >
        {/* Brand */}
        <div className="flex min-w-0 items-center gap-2.5">
          <Link to="/" className="group flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Motio2edit
              </p>
              <p className="truncate text-sm font-extrabold tracking-tight text-foreground">
                Motion2AI
              </p>
            </div>
          </Link>
        </div>

        {/* Mode tabs — desktop */}
        <nav
          className="hidden items-center gap-1 rounded-2xl border border-border/70 bg-card/60 p-1 shadow-sm backdrop-blur-md sm:flex"
          aria-label="Motion2AI modes"
        >
          {MODES.map((m) => {
            const Icon = m.icon;
            const locked =
              (m.id === "video" && !videoOk && !!user) || (m.id === "music" && !musicOk && !!user);
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openMode(m.id, m.href, locked)}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-sm font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  locked && "opacity-70",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
              </button>
            );
          })}
        </nav>

        {/* Credits + Upgrade */}
        <div className="flex shrink-0 items-center gap-2">
          {user && profile ? (
            <>
              <div
                className="flex items-center gap-1.5 rounded-full border border-border/70 bg-card/70 px-2.5 py-1 text-xs font-semibold backdrop-blur-md"
                title="Credits balance"
              >
                <Coins className="h-3.5 w-3.5 text-amber-500" />
                <span className="tabular-nums">{credits.toLocaleString()}</span>
              </div>
              <Button
                size="sm"
                variant="default"
                className="h-8 gap-1 rounded-full px-3 text-xs font-bold shadow-sm"
                onClick={() => navigate({ to: "/pricing" })}
              >
                Upgrade
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              className="h-8 rounded-full px-3.5 text-xs font-bold"
              onClick={() => navigate({ to: "/auth", search: { mode: "signin" } })}
            >
              Sign in
            </Button>
          )}
        </div>
      </div>

      {/* Mode tabs — mobile */}
      <div className="border-t border-border/40 px-3 pb-2 pt-1.5 sm:hidden">
        <div className="flex gap-1 rounded-2xl border border-border/70 bg-card/60 p-1">
          {MODES.map((m) => {
            const Icon = m.icon;
            const locked =
              (m.id === "video" && !videoOk && !!user) || (m.id === "music" && !musicOk && !!user);
            const active = activeMode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => openMode(m.id, m.href, locked)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-all",
                  active
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}

/** Landing body when user is signed in — primary entry into the three modes */
export function Motion2AILanding() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isAdmin = isAdminEmail(profile?.email);
  const planId = (profile?.plan ?? "free") as PlanId;
  const videoOk = canAccessVideo({ plan: planId, email: profile?.email, isAdmin });
  const musicOk = canAccessMusic({ plan: planId, email: profile?.email, isAdmin });
  const credits = profile?.credits ?? 0;

  const open = (mode: Motion2AIMode, href: string, locked: boolean) => {
    if (locked) {
      navigate({ to: "/pricing" });
      return;
    }
    try {
      if (mode === "image" || mode === "video") {
        sessionStorage.setItem("motio2edit-mode", mode);
      }
    } catch {
      /* ignore */
    }
    if (!user) {
      navigate({ to: "/auth", search: { redirect: href, mode: "signin" } });
      return;
    }
    navigate({ to: href as "/editor" | "/studio/video" | "/studio/music" });
  };

  return (
    <div className="relative min-h-[70dvh]">
      {/* Ambient glass background */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden
      >
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -right-20 top-32 h-72 w-72 rounded-full bg-orange-400/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-48 w-48 rounded-full bg-fuchsia-500/10 blur-3xl" />
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 pb-20 pt-6 sm:pt-10">
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
            Creative workspace
          </p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">
            Motion2AI
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            One workspace. Image, Video, and Music — switch modes, keep your flow.
          </p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Coins className="h-3.5 w-3.5 text-amber-500" />
              <span className="tabular-nums">{credits.toLocaleString()} credits</span>
            </div>
          )}
        </div>

        {/* Mode cards */}
        <div className="mt-8 grid gap-3 sm:grid-cols-3 sm:gap-4">
          {MODES.map((m) => {
            const Icon = m.icon;
            const locked =
              (m.id === "video" && !videoOk && !!user) || (m.id === "music" && !musicOk && !!user);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => open(m.id, m.href, locked)}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/70 p-5 text-left shadow-sm backdrop-blur-xl transition-all",
                  "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/10",
                  "active:scale-[0.98]",
                )}
              >
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-80" />
                <span className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/25">
                  <Icon className="h-6 w-6" />
                </span>
                <h2 className="relative mt-4 text-lg font-extrabold tracking-tight">{m.label}</h2>
                <p className="relative mt-1 text-xs text-muted-foreground">{m.description}</p>
                <span className="relative mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary">
                  {locked ? "Upgrade to unlock" : user ? "Open workspace" : "Explore · Sign in to create"}
                  <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </span>
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          AI+ editing tools (Circle 2edit, Remove BG, Cropmix, Filters…) stay in{" "}
          <Link to="/studio" className="font-semibold text-primary hover:underline">
            AI+ Tools
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
