import { Wand2, Check } from "lucide-react";
import { CompareSlider } from "@/components/CompareSlider";
import type { GenState } from "@/lib/editor/editor.types";

interface EditorPreviewProps {
  state: GenState;
  loadingMessage: string;
  progress: number;
  stage: number;
  stages: string[];
  output: string | null;
  outputIsVideo: boolean;
  mediaType: "image" | "video";
  inputPreview: string | null;
  inputKind: "image" | "video" | null;
  isAdmin: boolean;
  isFree: boolean;
  keepWatermark: boolean;
}

/**
 * Preview / result surface.
 * Before generation: returns null (no empty output block).
 * During generation: loading/analyzing UI.
 * After success: result (compare or media).
 */
export function EditorPreview({
  state,
  loadingMessage,
  progress,
  stage,
  stages,
  output,
  outputIsVideo,
  mediaType,
  inputPreview,
  inputKind,
  isAdmin,
  isFree,
  keepWatermark,
}: EditorPreviewProps) {
  if (state === "analyzing") {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card/70 p-6 text-center shadow-sm backdrop-blur-md animate-scale-in">
        <Wand2 className="h-8 w-8 animate-pulse text-primary" />
        <p className="mt-3 text-sm font-semibold text-primary">Analyzing your request…</p>
        <p className="mt-1 text-xs text-muted-foreground">Understanding exactly what you mean</p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 p-5 shadow-sm backdrop-blur-md animate-scale-in">
        <p className="text-sm font-semibold text-primary">{loadingMessage}</p>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <ul className="mt-4 space-y-2">
          {stages.map((s, i) => (
            <li key={s} className="flex items-center gap-2 text-sm">
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] transition-all ${
                  i < stage
                    ? "bg-primary text-primary-foreground"
                    : i === stage
                      ? "bg-primary/20 text-primary animate-pulse"
                      : "bg-secondary text-muted-foreground"
                }`}
              >
                {i < stage ? <Check className="h-3 w-3" /> : i + 1}
              </span>
              <span className={i <= stage ? "text-foreground" : "text-muted-foreground"}>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // No result yet — do not reserve empty Before/After panels
  if (!output) {
    return null;
  }

  if (!outputIsVideo && mediaType === "image" && inputPreview) {
    return (
      <div className="animate-scale-in overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-2 shadow-sm backdrop-blur-md">
        <CompareSlider before={inputPreview} after={output} />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/70 p-3 shadow-sm backdrop-blur-md animate-scale-in">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Result</p>
      <div className="flex min-h-[200px] items-center justify-center overflow-hidden rounded-xl bg-background/40">
        {outputIsVideo ? (
          <div className="relative h-full w-full min-h-[200px]">
            <video
              src={output}
              className="h-full w-full object-contain"
              controls
              autoPlay
              loop
              muted
            />
            {!isAdmin && (isFree || keepWatermark) && (
              <span className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-black/55 px-2 py-1 text-[11px] font-bold tracking-wide text-white/95">
                Motio2edit
              </span>
            )}
          </div>
        ) : (
          <img
            src={output}
            alt="output"
            className="max-h-[480px] w-full object-contain select-none"
            draggable={false}
            onContextMenu={(e) => e.preventDefault()}
            style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
          />
        )}
      </div>
      {inputKind === "image" && inputPreview && !outputIsVideo ? null : null}
    </div>
  );
}
