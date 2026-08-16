import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { ImageEditorToolPanel } from "@/components/editor/ImageEditorToolPanel";
import { Sparkles, Wand2, X } from "lucide-react";
import { EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";
import { VIDEO_QUICK_STYLES } from "@/lib/editor/editor.constants";

interface Suggestion {
  label: string;
  prompt: string;
}

interface EditorPromptPanelProps {
  mediaType: "image" | "video";
  loading: boolean;
  inputDataUrl: string | null;
  /** Preview URL for crop modal (blob/data/https). */
  inputPreview: string | null;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  taRef: React.RefObject<HTMLTextAreaElement>;
  suggestions: Suggestion[];
  /** Active tool op label shown as a chip (not the internal AI text). */
  activeToolLabel: string | null;
  onClearTool: () => void;
  /** Apply structured tool op — parent stores internal instruction, does not dump into visible prompt. */
  onToolOp: (op: { label: string; prompt: string }) => void;
  onCircleRemove: () => void;
  onCropApplied: (croppedDataUrl: string) => void;
}

/** Compact rotating ideas — max 3 chips, not a wall of examples. */
const COMPACT_IDEAS = EXAMPLE_PROMPTS.slice(0, 3);

export function EditorPromptPanel({
  mediaType,
  loading,
  inputDataUrl,
  inputPreview,
  prompt,
  setPrompt,
  taRef,
  suggestions,
  activeToolLabel,
  onClearTool,
  onToolOp,
  onCircleRemove,
  onCropApplied,
}: EditorPromptPanelProps) {
  return (
    <>
      {!loading && mediaType === "image" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            2. Choose a tool
          </p>
          <ImageEditorToolPanel
            hasImage={!!inputDataUrl}
            imageSrc={inputPreview || inputDataUrl}
            disabled={loading}
            onPrompt={(internalPrompt) =>
              onToolOp({
                label: "Tool",
                prompt: internalPrompt,
              })
            }
            onCircleRemove={onCircleRemove}
            onCropApplied={onCropApplied}
          />
          {activeToolLabel && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-semibold text-primary">Using: {activeToolLabel}</span>
              <button
                type="button"
                onClick={onClearTool}
                className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                aria-label="Clear tool"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </button>
            </div>
          )}
        </section>
      )}
      {!loading && mediaType === "video" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            2. Quick styles
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_QUICK_STYLES.slice(0, 4).map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => setPrompt(q.prompt)}
                className="btn-animate min-h-[40px] rounded-full border border-border bg-card px-3 py-2 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
              >
                <span className="mr-1">{q.emoji}</span>
                {q.label}
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          3. Describe
        </p>
        <div className="relative">
          <Textarea
            ref={taRef}
            placeholder={
              activeToolLabel
                ? "Optional: add extra direction…"
                : inputDataUrl
                  ? "Describe the edit… e.g. warmer light, remove the chair"
                  : `Describe the ${mediaType} you want…`
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            rows={4}
            disabled={loading}
            className="min-h-[100px] resize-none pr-12 text-base sm:text-sm"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton
              disabled={loading}
              onTranscript={(t) => setPrompt((p) => (p ? `${p} ${t}` : t).slice(0, 2000))}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-primary">
              <Wand2 className="h-3 w-3" /> Auto-enhanced before generating
            </span>
            <span>{prompt.length}/2000</span>
          </div>
        </div>

        {!loading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-fade-in">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[36px] rounded-full border border-primary/40 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary transition-all hover:bg-primary/10"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {!loading && !prompt.trim() && !activeToolLabel && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try an idea
            </span>
            {COMPACT_IDEAS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[32px] rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
