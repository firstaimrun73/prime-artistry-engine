import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { EditorToolCategories } from "@/components/EditorToolCategories";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Sparkles, Wand2, X } from "lucide-react";
import { EXAMPLE_PROMPTS } from "@/lib/prompt-suggestions";
import { VIDEO_QUICK_STYLES } from "@/lib/editor/editor.constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

const CONTEXT_TAGS = [
  { id: "outfit", label: "@Outfit", color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300" },
  { id: "background", label: "@Background", color: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300" },
  { id: "color", label: "@Color", color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300" },
  { id: "lighting", label: "@Lighting", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300" },
  { id: "style", label: "@Style", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300" },
  { id: "object", label: "@Object", color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300" },
] as const;

interface EditorPromptPanelProps {
  mediaType: "image" | "video";
  loading: boolean;
  inputDataUrl: string | null;
  inputPreview?: string | null;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  taRef: React.RefObject<HTMLTextAreaElement>;
  suggestions: Suggestion[];
  onSelectTool: (tool: ToolPayload) => void;
  onCropApplied?: (croppedDataUrl: string) => void;
  activeToolLabel?: string | null;
  onClearTool?: () => void;
  studioTier?: "standard" | "pro" | "premium";
  referenceCount?: number;
  maxChars?: number;
  contextTags?: string[];
  onToggleTag?: (tag: string) => void;
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
  studioTier = "standard",
  referenceCount = 0,
  maxChars = 2000,
  contextTags = [],
  onToggleTag,
}: EditorPromptPanelProps) {
  const [cropOpen, setCropOpen] = useState(false);
  const cropSrc = inputPreview || inputDataUrl;
  const limit = Math.max(200, Math.min(maxChars, 10000));
  const totalImages = (inputDataUrl ? 1 : 0) + Math.max(0, referenceCount);

  const operationLabel =
    mediaType !== "image"
      ? "Prompt"
      : totalImages >= 2
        ? `Image to image · ${totalImages} references`
        : totalImages === 1
          ? "Image to image editing"
          : "Text to image";

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

      <section className="space-y-2">
        <div className="relative overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
          <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-foreground/90">
              <span className="text-primary" aria-hidden>
                ✦
              </span>
              {operationLabel}
            </span>
            {contextTags.map((id) => {
              const tag = CONTEXT_TAGS.find((c) => c.id === id);
              if (!tag) return null;
              return (
                <span
                  key={id}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    tag.color,
                  )}
                >
                  {tag.label}
                  {onToggleTag && (
                    <button
                      type="button"
                      className="opacity-70 hover:opacity-100"
                      onClick={() => onToggleTag(id)}
                      aria-label={`Remove ${tag.label}`}
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </span>
              );
            })}
          </div>

          {mediaType === "image" && onToggleTag && (
            <div className="flex gap-1.5 overflow-x-auto border-b border-border/40 px-3 py-1.5 scrollbar-none">
              {CONTEXT_TAGS.map((tag) => {
                const active = contextTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    disabled={loading}
                    onClick={() => onToggleTag(tag.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors",
                      active
                        ? tag.color
                        : "border-border/60 bg-transparent text-muted-foreground hover:border-primary/40 hover:text-foreground",
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="relative px-3 pt-2 pb-2">
            <Textarea
              ref={taRef}
              placeholder={
                totalImages >= 1
                  ? "Describe the edit…"
                  : "Describe what you want to create…"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, limit))}
              rows={studioTier === "premium" ? 6 : studioTier === "pro" ? 5 : 4}
              disabled={loading}
              className="min-h-[100px] resize-none border-0 bg-transparent p-0 pr-12 text-base leading-relaxed shadow-none focus-visible:ring-0 sm:min-h-[112px] sm:text-sm"
            />
            <div className="absolute right-2 top-2">
              <VoiceInputButton
                disabled={loading}
                onTranscript={(txt) =>
                  setPrompt((p) => (p ? `${p} ${txt}` : txt).slice(0, limit))
                }
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-t border-border/40 px-3 py-1.5 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-primary/90">
              <Wand2 className="h-3 w-3" /> Auto-enhanced
            </span>
            <span className="tabular-nums">
              {prompt.length}/{limit}
            </span>
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
