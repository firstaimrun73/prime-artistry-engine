import { Link } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { studioGenerateClass, type StudioTier } from "@/lib/studio/studio-tier";

/**
 * Sticky mobile-friendly generate control.
 * Shows credits only — never provider USD (Phase 1 §14–15).
 */
export function StudioGenerateBar({
  tier,
  credits,
  balance,
  loading,
  disabled,
  loadingLabel = "Generating…",
  onGenerate,
  className,
}: {
  tier: StudioTier;
  credits: number | null;
  balance?: number | null;
  loading: boolean;
  disabled?: boolean;
  loadingLabel?: string;
  onGenerate: () => void;
  className?: string;
}) {
  const canAfford =
    credits == null || balance == null || balance >= credits;
  const block = loading || disabled || !canAfford;

  return (
    <div
      className={cn(
        "sticky bottom-20 z-10 rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lg backdrop-blur-md md:static md:shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Estimated </span>
          {credits != null ? (
            <span className="font-bold tabular-nums">{credits} credits</span>
          ) : (
            <span>—</span>
          )}
          {balance != null && (
            <span className="ml-2 text-[11px] text-muted-foreground">
              · Balance {balance.toLocaleString()}
            </span>
          )}
        </div>
        {!canAfford && (
          <Link
            to="/pricing"
            className="text-xs font-semibold text-primary underline-offset-2 hover:underline"
          >
            Get credits
          </Link>
        )}
      </div>
      <Button
        type="button"
        disabled={block}
        onClick={() => {
          if (block) return;
          onGenerate();
        }}
        className={cn(
          "h-12 w-full rounded-xl text-base font-semibold shadow-md",
          studioGenerateClass(tier),
        )}
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {loadingLabel}
          </>
        ) : !canAfford ? (
          "Not enough credits"
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Generate
            {credits != null ? ` · ${credits} credits` : ""}
          </>
        )}
      </Button>
    </div>
  );
}
