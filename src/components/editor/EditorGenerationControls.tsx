import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorGenerationControlsProps {
  loading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  videoLocked: boolean;
  noCredits: boolean;
  /** Optional Experience-specific generate button classes (Premium/Ultra AI). */
  generateClassName?: string;
}

export function EditorGenerationControls({
  loading,
  onGenerate,
  onStop,
  videoLocked,
  noCredits,
  generateClassName,
}: EditorGenerationControlsProps) {
  return (
    <div className="space-y-3">
      {loading ? (
        <Button
          type="button"
          variant="outline"
          className="min-h-[48px] w-full text-base font-semibold"
          onClick={onStop}
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Stop generation
        </Button>
      ) : (
        <Button
          type="button"
          className={cn(
            "min-h-[48px] w-full text-base font-semibold",
            generateClassName,
          )}
          onClick={onGenerate}
          disabled={videoLocked || noCredits}
        >
          Generate
        </Button>
      )}

      {noCredits && !loading && (
        <p className="text-center text-sm text-muted-foreground">
          Out of credits —{" "}
          <Link to="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            upgrade or top up
          </Link>
        </p>
      )}

      {videoLocked && (
        <p className="text-center text-sm text-muted-foreground">
          Video generation needs a paid plan.{" "}
          <Link to="/pricing" className="font-medium text-primary underline-offset-2 hover:underline">
            View plans
          </Link>
        </p>
      )}
    </div>
  );
}
