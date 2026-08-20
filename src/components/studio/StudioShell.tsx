import { Link } from "@tanstack/react-router";
import { Coins } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  studioAccentClass,
  studioShellClass,
  type StudioEditorKind,
  type StudioTier,
} from "@/lib/studio/studio-tier";

const TITLES: Record<StudioEditorKind, string> = {
  image: "IMG",
  video: "Video",
  music: "Music",
};

/**
 * Editor content shell only — does not replace global Header/nav (Phase 1 §2).
 */
export function StudioShell({
  kind,
  tier,
  credits,
  subtitle,
  children,
  className,
}: {
  kind: StudioEditorKind;
  tier: StudioTier;
  credits?: number | null;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[calc(100vh-4rem)] w-full min-w-0 flex-col overflow-x-clip",
        studioShellClass(tier),
        className,
      )}
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 py-5 pb-28 sm:px-6 md:pb-10 lg:max-w-7xl lg:px-8">
        <div className="mb-6 flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <Link
              to="/studio"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← All studios
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
              {TITLES[kind]}{" "}
              <span className="text-orange-500">Studio</span>
            </h1>
            {subtitle && (
              <p className="mt-1 max-w-md text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className="inline-flex shrink-0 items-center gap-2 rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-sm shadow-sm backdrop-blur">
            <Coins className={cn("h-4 w-4", studioAccentClass(tier))} />
            <span className="tabular-nums font-semibold">
              {credits != null ? credits.toLocaleString() : "—"}
            </span>
            <span className="text-muted-foreground">credits</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
