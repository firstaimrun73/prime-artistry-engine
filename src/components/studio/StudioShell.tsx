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
  image: "Image",
  video: "Video",
  music: "Music",
};

/**
 * Editor content shell only — does not replace global Header/nav.
 * Back always → homepage (never Image Studio hub).
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
              to="/"
              className="text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Home
            </Link>
            <h1 className={cn("mt-1 text-2xl font-extrabold tracking-tight", studioAccentClass(tier))}>
              {TITLES[kind]} Studio
            </h1>
            {subtitle ? (
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {typeof credits === "number" ? (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold tabular-nums">
              <Coins className="h-3.5 w-3.5 text-primary" />
              {credits.toLocaleString()} credits
            </div>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
