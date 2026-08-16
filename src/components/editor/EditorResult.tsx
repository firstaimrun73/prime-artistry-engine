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
}

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
}: EditorResultProps) {
  return (
    <>
      {output && !loading && (
        <div className="space-y-2 animate-fade-in">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Button variant="default" className="min-h-[44px]" onClick={onDownload}>
              <Download className="mr-1.5 h-4 w-4" /> Download
            </Button>
            <Button variant="outline" className="min-h-[44px]" onClick={onRegenerate}>
              <RefreshCw className="mr-1.5 h-4 w-4" /> Regenerate
            </Button>
            <Button variant="outline" className="min-h-[44px]" onClick={onEditAgain}>
              <Recycle className="mr-1.5 h-4 w-4" /> Edit Again
            </Button>
            <Button variant="outline" className="min-h-[44px]" onClick={onShare}>
              <Share2 className="mr-1.5 h-4 w-4" /> Share
            </Button>
          </div>
          <Button variant="ghost" className="min-h-[44px] w-full" onClick={onClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
          {isFree && (
            <p className="text-center text-[11px] text-muted-foreground">
              Free images include a small watermark. <Link to="/pricing" className="underline">Upgrade</Link> to remove it.
            </p>
          )}
        </div>
      )}

      {downloaded && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm animate-fade-in">
          <span className="text-muted-foreground">Saved! What next?</span>
          <Button size="sm" variant="secondary" onClick={onClear}>
            <RotateCcw className="mr-1.5 h-4 w-4" /> New Edit
          </Button>
        </div>
      )}
    </>
  );
}