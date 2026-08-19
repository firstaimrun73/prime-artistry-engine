import { useRef, useState } from "react";
import { Download, RefreshCw, X, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { VideoStudioResult } from "./video-studio-types";

export function VideoOutputView({
  result,
  onClose,
  onRegenerate,
  onDownload,
}: {
  result: VideoStudioResult;
  onClose: () => void;
  onRegenerate: () => void;
  onDownload: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tab, setTab] = useState<"description" | "input">("description");

  const modeLabel =
    result.mode === "text"
      ? "Text \u2192 Video"
      : result.mode === "image"
        ? "Image \u2192 Video"
        : "Video \u2192 Video";

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-base font-bold">Output</h2>
        <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-muted" aria-label="Close">
          <X className="h-5 w-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-4">
          <div className="overflow-hidden rounded-2xl bg-black">
            <video
              ref={videoRef}
              src={result.outputUrl}
              controls
              playsInline
              className="mx-auto max-h-[50vh] w-full"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={onRegenerate}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Regenerate
            </Button>
            <Button size="sm" variant="secondary" onClick={onDownload}>
              <Download className="mr-1.5 h-3.5 w-3.5" /> Download
            </Button>
            <Button size="sm" variant="outline" onClick={onClose}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit again
            </Button>
          </div>

          <div className="flex gap-2 border-b border-border">
            {(["description", "input"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={cn(
                  "px-3 py-2 text-sm font-semibold capitalize",
                  tab === t ? "border-b-2 border-red-500 text-red-600" : "text-muted-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === "description" ? (
            <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
              <p className="font-semibold">About this video</p>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-muted-foreground">
                <dt>Mode</dt>
                <dd className="text-foreground">{modeLabel}</dd>
                <dt>Quality</dt>
                <dd className="text-foreground">{result.quality}</dd>
                <dt>Aspect ratio</dt>
                <dd className="text-foreground">{result.aspect}</dd>
                <dt>Duration</dt>
                <dd className="text-foreground">{result.duration}s</dd>
                <dt>Sound</dt>
                <dd className="text-foreground">{result.soundRequested ? "Requested" : "No"}</dd>
                <dt>Credits used</dt>
                <dd className="text-foreground">{result.creditsUsed}</dd>
              </dl>
              <p className="pt-2 text-xs text-muted-foreground">Prompt applied by Motio2AI</p>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-border p-4 text-sm">
              <p className="font-semibold">Input</p>
              <p className="text-muted-foreground">
                Type: <span className="text-foreground">{modeLabel}</span>
              </p>
              {result.sourcePreview && (
                <div className="overflow-hidden rounded-xl border bg-black/5">
                  {result.mode === "video" ? (
                    <video src={result.sourcePreview} className="mx-auto max-h-32 object-contain" />
                  ) : result.mode === "image" ? (
                    <img src={result.sourcePreview} alt="" className="mx-auto max-h-32 object-contain" />
                  ) : null}
                </div>
              )}
              <p className="text-muted-foreground">Prompt</p>
              <p className="whitespace-pre-wrap text-foreground">{result.prompt || "\u2014"}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
