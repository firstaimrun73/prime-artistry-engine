import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VideoResultMeta = {
  url: string;
  mode: string;
  tier: string;
  aspect: string;
  duration: number;
  soundRequested: boolean;
  creditsUsed: number;
  prompt?: string;
};

export function VideoOutputView({
  result,
  onReset,
  className,
}: {
  result: VideoResultMeta;
  onReset: () => void;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="overflow-hidden rounded-2xl border border-border bg-black">
        <video
          src={result.url}
          controls
          playsInline
          className="mx-auto max-h-[min(60vh,520px)] w-full object-contain"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          className="flex-1 rounded-xl bg-orange-500 text-white hover:bg-orange-600"
          onClick={() => {
            const a = document.createElement("a");
            a.href = result.url;
            a.download = "motio2edit-video.mp4";
            a.target = "_blank";
            a.rel = "noopener";
            a.click();
          }}
        >
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onReset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          New video
        </Button>
      </div>
      <div className="space-y-3 rounded-2xl border border-border p-4 text-sm">
        <p className="font-semibold">Details</p>
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <dt>Mode</dt>
          <dd className="text-foreground">{result.mode}</dd>
          <dt>Tier</dt>
          <dd className="text-foreground">{result.tier}</dd>
          <dt>Aspect ratio</dt>
          <dd className="text-foreground">{result.aspect}</dd>
          <dt>Duration</dt>
          <dd className="text-foreground">{result.duration}s</dd>
          <dt>Audio</dt>
          <dd className="text-foreground">{result.soundRequested ? "Requested" : "No"}</dd>
          <dt>Credits used</dt>
          <dd className="text-foreground">{result.creditsUsed}</dd>
        </dl>
        <p className="pt-2 text-xs text-muted-foreground">Prompt applied by Motio2AI</p>
      </div>
    </div>
  );
}
