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
          className="grid h-10 w-10 place-items-center rounded-full border border-border"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
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

      <div className="grid shrink-0 grid-cols-3 gap-3 border-t border-border bg-card/80 p-4">
        <button
          type="button"
          onClick={download}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border px-2 py-3 text-sm font-semibold"
        >
          <Download className="h-6 w-6" strokeWidth={2.25} />
          Download
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border px-2 py-3 text-sm font-semibold"
        >
          <Share2 className="h-6 w-6" strokeWidth={2.25} />
          Share
        </button>
        <button
          type="button"
          onClick={onEditAgain}
          className="flex min-h-[52px] flex-col items-center justify-center gap-1.5 rounded-2xl border border-border px-2 py-3 text-sm font-semibold"
        >
          <RotateCcw className="h-6 w-6" strokeWidth={2.25} />
          Edit Again
        </button>
      </div>
    </div>
  );
}
