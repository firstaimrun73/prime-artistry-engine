import { Button } from "@/components/ui/button";
import { Download, RefreshCw, Recycle, Share2, RotateCcw } from "lucide-react";
import { Link } from "@tanstack/react-router";

interface EditorResultProps {
  output: string | null;
  loading: boolean;
  onDownload: () => void;
  onRegenerate: () => void;
  onEditAgain: () => void;
  onShare: () => void;
  onClear: () => void;
  isFree: boolean;
  downloaded: boolean;
  /** When true (I2I / multi-ref), show Edit Again. When false (T2I), show Regenerate. Never both. */
  hasSourceImage?: boolean;
}

const btnBase =
  "min-h-[42px] rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5A1F]/35";

export function EditorResult({
  output,
  loading,
  onDownload,
  onRegenerate,
  onEditAgain,
  onShare,
  onClear,
  isFree,
  downloaded,
  hasSourceImage = false,
}: EditorResultProps) {
  return (
    <>
      {output && !loading && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <Button
              variant="default"
              className={`${btnBase} bg-[#FF5A1F] text-white hover:bg-[#FF5A1F]/90 shadow-sm shadow-[#FF5A1F]/25`}
              onClick={onDownload}
            >
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            {hasSourceImage ? (
              <Button
                variant="outline"
                className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
                onClick={onEditAgain}
              >
                <Recycle className="mr-1.5 h-4 w-4" /> Edit Again
              </Button>
            ) : (
              <Button
                variant="outline"
                className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
                onClick={onRegenerate}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
              </Button>
            )}
            <Button
              variant="outline"
              className={`${btnBase} border-border/70 bg-card/40 backdrop-blur-sm hover:border-[#FF5A1F]/40`}
              onClick={onShare}
            >
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
          <Button
            variant="ghost"
            className={`${btnBase} w-full text-muted-foreground hover:text-foreground`}
            onClick={onClear}
          >
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
          {isFree && (
            <p className="text-center text-[11px] text-muted-foreground">
              Free images include a small watermark.{" "}
              <Link to="/pricing" className="underline decoration-[#FF5A1F]/50 underline-offset-2 hover:text-[#FF5A1F]">
                Upgrade
              </Link>{" "}
              to remove it.
            </p>
          )}
        </div>
      )}

      {downloaded && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-card/60 p-3 text-sm shadow-sm backdrop-blur-sm animate-fade-in">
          <span className="text-muted-foreground">Saved! What next?</span>
          <Button size="sm" variant="secondary" className="rounded-lg" onClick={onClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
        </div>
      )}
    </>
  );
}
