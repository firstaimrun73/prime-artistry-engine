import { useEffect, useMemo, useRef, useState } from "react";
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

type ContextTagId = (typeof CONTEXT_TAGS)[number]["id"];

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

/** Detect trailing @query in the prompt for contextual tag autocomplete. */
function extractAtQuery(text: string): { query: string; start: number } | null {
  const m = text.match(/(^|[\s([{])@([a-zA-Z]*)$/);
  if (!m || m.index === undefined) return null;
  const atIndex = m.index + (m[1] ? m[1].length : 0);
  return { query: (m[2] ?? "").toLowerCase(), start: atIndex };
}

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
  const [atMenuOpen, setAtMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cropSrc = inputPreview || inputDataUrl;
  const limit = Math.max(200, Math.min(maxChars, 10000));
  const totalImages = (inputDataUrl ? 1 : 0) + Math.max(0, referenceCount);

  // Subtle context — never a mode selector / never "Text to image"
  const contextHint =
    mediaType !== "image"
      ? null
      : totalImages >= 2
        ? `Using ${totalImages} image references`
        : totalImages === 1
          ? "Editing 1 image"
          : "Create";

  const atQuery = useMemo(() => extractAtQuery(prompt), [prompt]);

  const atMatches = useMemo(() => {
    if (!atQuery) return [];
    const q = atQuery.query;
    return CONTEXT_TAGS.filter(
      (t) => t.id.startsWith(q) || t.label.toLowerCase().includes(`@${q}`),
    );
  }, [atQuery]);

  useEffect(() => {
    setAtMenuOpen(!!atQuery && atMatches.length > 0 && mediaType === "image");
  }, [atQuery, atMatches.length, mediaType]);

  const insertTag = (tagId: ContextTagId) => {
    const tag = CONTEXT_TAGS.find((c) => c.id === tagId);
    if (!tag) return;

    setPrompt((prev) => {
      const info = extractAtQuery(prev);
      if (info) {
        const before = prev.slice(0, info.start);
        const after = prev.slice(info.start + 1 + info.query.length);
        const needsSpace = before.length > 0 && !/\s$/.test(before);
        return `${before}${needsSpace ? " " : ""}${tag.label} ${after}`.slice(0, limit);
      }
      const base = prev.trim();
      return (base ? `${base} ${tag.label} ` : `${tag.label} `).slice(0, limit);
    });

    if (onToggleTag && !contextTags.includes(tagId)) {
      onToggleTag(tagId);
    }
    setAtMenuOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const removeChip = (id: string) => {
    const tag = CONTEXT_TAGS.find((c) => c.id === id);
    if (tag) {
      setPrompt((p) =>
        p
          .replace(new RegExp(`${tag.label}\\s?`, "gi"), "")
          .replace(/\s{2,}/g, " ")
          .trim(),
      );
    }
    onToggleTag?.(id);
  };

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
        <section className="min-w-0 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Tools
          </p>
          <EditorToolCategories
            hasImage={!!inputDataUrl}
            disabled={loading}
            onSelectTool={handleTool}
          />
          {activeToolLabel && (
            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
              <span className="min-w-0 truncate font-semibold text-primary">Using: {activeToolLabel}</span>
              {onClearTool && (
                <button
                  type="button"
                  onClick={onClearTool}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" /> Clear
                </button>
              )}
            </div>
          )}
        </section>
      )}

      {mediaType === "video" && (
        <section className="min-w-0 space-y-2">
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

      <section className="min-w-0 space-y-2">
        <div className="relative min-w-0 overflow-hidden rounded-xl border border-border/70 bg-card/80 shadow-sm ring-1 ring-black/[0.02] dark:ring-white/[0.04]">
          {/* Context chips only for selected tags — never permanent full tag row */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 border-b border-border/50 px-2.5 py-1.5 sm:px-3 sm:py-2">
            {contextHint && (
              <span className="inline-flex shrink-0 items-center gap-1 text-[10px] font-medium tracking-wide text-muted-foreground sm:text-[11px]">
                <span className="text-primary/80" aria-hidden>
                  ✦
                </span>
                {contextHint}
              </span>
            )}
            {contextTags.map((id) => {
              const tag = CONTEXT_TAGS.find((c) => c.id === id);
              if (!tag) return null;
              return (
                <span
                  key={id}
                  className={cn(
                    "inline-flex max-w-full items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold sm:px-2",
                    tag.color,
                  )}
                >
                  {tag.label}
                  <button
                    type="button"
                    className="opacity-70 hover:opacity-100"
                    onClick={() => removeChip(id)}
                    aria-label={`Remove ${tag.label}`}
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              );
            })}
            <span className="ml-auto hidden text-[10px] text-muted-foreground/70 sm:inline">
              Type @ for tags
            </span>
          </div>

          <div className="relative min-w-0 px-2.5 pt-2 pb-1.5 sm:px-3 sm:pt-2 sm:pb-2">
            <Textarea
              ref={taRef}
              placeholder={
                totalImages >= 1
                  ? "Describe the edit… (type @ for tags)"
                  : "Describe what you want to create… (type @ for tags)"
              }
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, limit))}
              onKeyDown={(e) => {
                if (atMenuOpen && atMatches.length > 0 && (e.key === "Enter" || e.key === "Tab")) {
                  e.preventDefault();
                  insertTag(atMatches[0].id);
                }
                if (e.key === "Escape") setAtMenuOpen(false);
              }}
              rows={studioTier === "premium" ? 4 : 3}
              disabled={loading}
              className="min-h-[72px] w-full max-w-full resize-none border-0 bg-transparent p-0 pr-12 text-[15px] leading-relaxed shadow-none focus-visible:ring-0 sm:min-h-[96px] sm:pr-12 sm:text-sm md:min-h-[112px]"
            />
            {/* Mic + listening stay inside composer (absolute, no page float) */}
            <div className="absolute right-1.5 top-1.5 z-10 flex max-w-[calc(100%-0.75rem)] items-start justify-end sm:right-2 sm:top-2">
              <VoiceInputButton
                disabled={loading}
                onTranscript={(txt) =>
                  setPrompt((p) => (p ? `${p} ${txt}` : txt).slice(0, limit))
                }
              />
            </div>

            {atMenuOpen && atMatches.length > 0 && (
              <div
                ref={menuRef}
                role="listbox"
                className="absolute left-2 right-2 z-20 mt-0.5 max-h-40 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-lg sm:left-3 sm:right-14"
              >
                {atMatches.map((tag) => (
                  <button
                    key={tag.id}
                    type="button"
                    role="option"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertTag(tag.id);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[10px]",
                        tag.color,
                      )}
                    >
                      {tag.label}
                    </span>
                    <span className="text-[10px] font-normal text-muted-foreground">
                      Add context
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-2 border-t border-border/40 px-2.5 py-1.5 text-[10px] text-muted-foreground sm:px-3 sm:text-[11px]">
            <span className="inline-flex min-w-0 items-center gap-1 text-primary/90">
              <Wand2 className="h-3 w-3 shrink-0" />
              <span className="truncate">Auto-enhanced</span>
            </span>
            <span className="shrink-0 tabular-nums">
              {prompt.length}/{limit}
            </span>
          </div>
        </div>

        {!loading && suggestions.length > 0 && (
          <div className="-mx-0.5 flex gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
            {suggestions.slice(0, 3).map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[32px] shrink-0 rounded-full border border-primary/30 bg-primary/5 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/10"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {!loading && !prompt.trim() && !activeToolLabel && mediaType === "image" && (
          <div className="-mx-0.5 flex items-center gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try:
            </span>
            {IMAGE_IDEAS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[30px] shrink-0 rounded-full border border-border/80 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {!loading && !prompt.trim() && !activeToolLabel && mediaType !== "image" && (
          <div className="-mx-0.5 flex items-center gap-1.5 overflow-x-auto px-0.5 pb-0.5 scrollbar-none">
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" /> Try:
            </span>
            {COMPACT_IDEAS.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => setPrompt(s.prompt)}
                className="min-h-[30px] shrink-0 rounded-full border border-border/80 bg-transparent px-2.5 py-1 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
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
