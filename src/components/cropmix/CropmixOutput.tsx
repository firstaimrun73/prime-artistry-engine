/**
 * Cropmix Output — Download / Share / Edit Again.
 * Watermark, if any, is already baked into dataUrl.
 */
import { Download, Share2, RotateCcw, X } from "lucide-react";

type Props = {
  dataUrl: string;
  width: number;
  height: number;
  onEditAgain: () => void;
  onClose: () => void;
};

export function CropmixOutput({
  dataUrl,
  width,
  height,
  onEditAgain,
  onClose,
}: Props) {
  const download = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `cropmix-${width}x${height}.jpg`;
    a.click();
  };

  const share = async () => {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], "cropmix.jpg", {
        type: blob.type || "image/jpeg",
      });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "Cropmix",
        });
        return;
      }
    } catch {
      // fall through
    }
    download();
  };

  return (
    <div className="flex h-full flex-col bg-background">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5">
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center rounded-full border border-border"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Crop result</p>
          <p className="text-[11px] text-muted-foreground">
            {width}×{height}
          </p>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-black/90 p-3">
        <img
          src={dataUrl}
          alt="Result"
          className="max-h-full max-w-full object-contain"
        />
      </div>

      <div className="grid shrink-0 grid-cols-3 gap-2 border-t border-border bg-card/80 p-4">
        <button
          type="button"
          onClick={download}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
        >
          <Share2 className="h-4 w-4" />
          Share
        </button>
        <button
          type="button"
          onClick={onEditAgain}
          className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-3 text-sm font-medium"
        >
          <RotateCcw className="h-4 w-4" />
          Edit Again
        </button>
      </div>
    </div>
  );
}
