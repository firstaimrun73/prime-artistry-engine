import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { EditorToolCategories } from "@/components/EditorToolCategories";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Sparkles, Wand2, X } from "lucide-react";
import { EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";
import { VIDEO_QUICK_STYLES } from "@/lib/editor/editor.constants";
import { toast } from "sonner";

interface Suggestion {
  label: string;
  prompt: string;
}

type ToolPayload = {
  id?: string;
  label?: string;
  prompt: string;
  uiOnly?: boolean;
};

interface EditorPromptPanelProps {
  mediaType: "image" | "video";
  loading: boolean;
  inputDataUrl: string | null;
  /** Optional preview for crop (falls back to inputDataUrl). */
  inputPreview?: string | null;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  taRef: React.RefObject<HTMLTextAreaElement>;
  suggestions: Suggestion[];
  /** Legacy + primary: parent handles circle-remove; panel handles crop locally. */
  onSelectTool: (tool: ToolPayload) => void;
  /** When provided, crop Apply updates the working image without generation. */
  onCropApplied?: (croppedDataUrl: string) => void;
  /**
   * When true, non-UI tools are reported via onSelectTool but the parent is
   * expected to store internal instructions separately (not force them into
   * the visible prompt). Panel shows an optional active chip if activeToolLabel is set.
   */
  activeToolLabel?: string | null;
  onClearTool?: () => void;
}

const IMAGE_IDEAS = [
  { label: "Remove background", prompt: "Remove the background cleanly and replace with a transparent or pure white backdrop, keeping the subject sharp and natural." },
  { label: "Replace background", prompt: "Replace the background with a clean professional studio backdrop while preserving the subject, lighting, and edges." },
  { label: "Sky replacement", prompt: "Replace the sky with a dramatic natural sky and re-light the scene so shadows and color temperature match." },
  { label: "Enhance lighting", prompt: "Improve lighting and color balance for a polished, natural look while preserving identity and composition." },
] as const;

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
  onSelectTool,
  onCropApplied,
  activeToolLabel,
  onClearTool,
}: EditorPromptPanelProps) {
  const [cropOpen, setCropOpen] = useState(false);
  const cropSrc = inputPreview || inputDataUrl;

  const handleTool = (tool: ToolPayload) => {
    if (tool.prompt === "__CROP__" || tool.id === "crop") {
      if (!inputDataUrl || !cropSrc) {
        toast.error("Upload an image first to crop.");
        return;
      }
      if (!onCropApplied) {
        toast.error("Crop is not available in this session.");
        return;
      }
      setCropOpen(true);
      return;
    }
    onSelectTool(tool);
  };

  return (
    <>
      {mediaType === "image" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tools
          </p>
          <EditorToolCategories
            hasImage={!!inputDataUrl}
            disabled={loading}
            onSelectTool={handleTool}
          />
          {activeToolLabel && (
            <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="font-semibold text-primary">Using: {activeToolLabel}</span>
              {onClearTool && (
                <button
                  type="button"
                  onClick={onClearTool}
                  className="ml-auto inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {mediaType === "video" && (
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick styles
          </p>
          <div className="flex flex-wrap gap-2">
            {VIDEO_QUICK_STYLES.map((q) => (
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

      <section className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Prompt
        </p>
        <div className="relative">
          <Textarea
            ref={taRef}
            placeholder={
              activeToolLabel
                ? "Optional: add extra direction…"
                : "Describe what you want…"
            }
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 2000))}
            rows={4}
            disabled={loading}
            className="min-h-[112px] resize-none pr-12 text-base leading-relaxed sm:text-sm"
          />
          <div className="absolute right-2 top-2">
            <VoiceInputButton
              disabled={loading}
              onTranscript={(t) => setPrompt((p) => (p ? `${p} ${t}` : t).slice(0, 2000))}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary/90">
              <Wand2 className="h-3 w-3" /> Auto-enhanced before generating
            </span>
            <span className="tabular-nums">{prompt.length}/2000</span>
          </div>
        </div>

        {!loading && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[32px] rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {!loading && !prompt.trim() && !activeToolLabel && mediaType === "image" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try an idea:
            </span>
            {IMAGE_IDEAS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[30px] rounded-full border border-border/80 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {!loading && !prompt.trim() && !activeToolLabel && mediaType !== "image" && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try an idea:
            </span>
            {COMPACT_IDEAS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[30px] rounded-full border border-border/80 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </section>

      {cropSrc && onCropApplied && (
        <ImageCropModal
          open={cropOpen}
          imageSrc={cropSrc}
          onClose={() => setCropOpen(false)}
          onApply={(cropped) => {
            onCropApplied(cropped);
            setCropOpen(false);
            toast.success("Crop applied — this image will be used for generation.");
          }}
        />
      )}
    </>
  );
}
