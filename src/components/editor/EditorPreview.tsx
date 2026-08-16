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
      <div className="flex h-full min-h-56 flex-col items-center justify-center rounded-xl border border-border bg-card p-6 text-center animate-scale-in">
        <Wand2 className="h-8 w-8 animate-pulse text-primary" />
        <p className="mt-3 text-sm font-semibold text-primary">Analyzing your request…</p>
        <p className="mt-1 text-xs text-muted-foreground">Understanding exactly what you mean</p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="rounded-xl border border-border bg-card p-5 animate-scale-in">
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
                  i < stage ? "bg-primary text-primary-foreground"
                  : i === stage ? "bg-primary/20 text-primary animate-pulse"
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

  if (output && !outputIsVideo && mediaType === "image" && inputPreview) {
    return (
      <div className="animate-scale-in">
        <CompareSlider before={inputPreview} after={output} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Before</p>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
          {inputPreview ? (
            inputKind === "video" ? (
              <video src={inputPreview} className="h-full w-full object-cover" controls />
            ) : (
              <img src={inputPreview} alt="input" className="h-full w-full object-contain" />
            )
          ) : (
            <span className="text-xs text-muted-foreground">No upload</span>
          )}
        </div>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">After</p>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
          {output ? (
            outputIsVideo ? (
              <div className="relative h-full w-full">
                <video src={output} className="h-full w-full object-contain animate-scale-in" controls autoPlay loop muted />
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
                className="h-full w-full object-contain animate-scale-in select-none"
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                style={{ WebkitUserSelect: "none", WebkitTouchCallout: "none" }}
              />
            )
          ) : (
            <span className="text-xs text-muted-foreground">Output appears here</span>
          )}
        </div>
      </div>
    </div>
  );
}