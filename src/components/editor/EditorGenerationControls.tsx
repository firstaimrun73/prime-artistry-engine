import { Button } from "@/components/ui/button";
import { Sparkles, Square } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EditorGenerationControlsProps {
  loading: boolean;
  onGenerate: () => void;
  onStop: () => void;
  videoLocked: boolean;
  noCredits: boolean;
}

export function EditorGenerationControls({
  loading,
  onGenerate,
  onStop,
  videoLocked,
  noCredits,
}: EditorGenerationControlsProps) {
  return (
    <section className="space-y-2 pt-1">
      {loading ? (
        <Button variant="destructive" className="min-h-[48px] w-full text-base" onClick={onStop}>
          <Square className="mr-1.5 h-4 w-4 fill-current" /> Stop Generation
        </Button>
      ) : (
        <Button className="min-h-[48px] w-full text-base hover-scale" onClick={onGenerate} disabled={videoLocked || noCredits}>
          <Sparkles className="mr-1.5 h-4 w-4" /> Generate
        </Button>
      )}

      {noCredits && (
        <p className="text-center text-xs text-destructive-foreground">
          Out of credits — <Link to="/pricing" className="underline">get more</Link>.
        </p>
      )}
    </section>
  );
}