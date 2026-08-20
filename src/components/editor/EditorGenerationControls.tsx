import { Button } from "@/components/ui/button";
import { Sparkles, Square } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

interface EditorGenerationControlsProps {
  loading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  videoLocked: boolean;
  noCredits: boolean;
  /** Image Studio Auto mode (separate from Global Auto page) */
  autoMode?: boolean;
  onAutoModeChange?: (on: boolean) => void;
  /** Hide Auto toggle for video media */
  showAutoToggle?: boolean;
  /** Optional Experience-specific generate button classes (Premium/Ultra AI). */
  generateClassName?: string;
}

export function EditorGenerationControls({
  loading,
  onGenerate,
  onStop,
  videoLocked,
  noCredits,
  autoMode = false,
  onAutoModeChange,
  showAutoToggle = true,
  generateClassName,
}: EditorGenerationControlsProps) {
  return (
    <section className="space-y-3 pt-1">
      {showAutoToggle && onAutoModeChange && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-xs font-semibold">Auto</p>
            <p className="text-[11px] text-muted-foreground">
              {autoMode
                ? "ON — analysis drives the edit; prompt & tools optional"
                : "OFF — use prompt and tools as usual"}
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={autoMode}
            aria-label="Auto mode"
            disabled={loading}
            onClick={() => onAutoModeChange(!autoMode)}
            className={cn(
              "relative h-7 w-12 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              autoMode ? "bg-primary" : "bg-muted",
              loading && "opacity-50",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-background shadow transition-transform",
                autoMode && "translate-x-5",
              )}
            />
          </button>
        </div>
      )}

      {loading ? (
        <Button variant="destructive" className="min-h-[48px] w-full text-base" onClick={onStop}>
          <Square className="mr-1.5 h-4 w-4 fill-current" /> Stop Generation
        </Button>
      ) : (
        <Button
          className={cn("min-h-[48px] w-full text-base hover-scale", generateClassName)}
          onClick={onGenerate}
          disabled={videoLocked || noCredits}
        >
          <Sparkles className="mr-1.5 h-4 w-4" />
          {autoMode ? "Generate with Auto" : "Generate"}
        </Button>
      )}

      {noCredits && (
        <p className="text-center text-xs text-destructive-foreground">
          Out of credits —{" "}
          <Link to="/pricing" className="underline">
            get more
          </Link>
          .
        </p>
      )}
    </section>
  );
}
