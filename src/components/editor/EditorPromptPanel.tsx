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

/** Structured context tags — chips only; not counted in character limit. */
export const CONTEXT_TAGS = [
  { id: "outfit", label: "@Outfit", color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300", guidance: "Focus edit on clothing and outfit." },
  { id: "clothing", label: "@Clothing", color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300", guidance: "Adjust garments and fabric." },
  { id: "accessories", label: "@Accessories", color: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-400/40 dark:text-fuchsia-300", guidance: "Edit accessories (jewelry, bags, hats)." },
  { id: "hair", label: "@Hair", color: "bg-pink-500/15 text-pink-700 border-pink-400/40 dark:text-pink-300", guidance: "Edit hair style and color." },
  { id: "face", label: "@Face", color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300", guidance: "Preserve identity; refine facial features." },
  { id: "skin", label: "@Skin", color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300", guidance: "Natural skin tone and texture." },
  { id: "pose", label: "@Pose", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300", guidance: "Adjust body pose if requested." },
  { id: "body", label: "@Body", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300", guidance: "Body proportions stay natural." },
  { id: "object", label: "@Object", color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300", guidance: "Focus on object changes." },
  { id: "person", label: "@Person", color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300", guidance: "Primary subject is the person." },
  { id: "background", label: "@Background", color: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300", guidance: "Edit or replace background." },
  { id: "environment", label: "@Environment", color: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300", guidance: "Environment and setting context." },
  { id: "sky", label: "@Sky", color: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300", guidance: "Sky and atmospheric background." },
  { id: "lighting", label: "@Lighting", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300", guidance: "Adjust lighting and shadows." },
  { id: "color", label: "@Color", color: "bg-rose-500/15 text-rose-700 border-rose-400/40 dark:text-rose-300", guidance: "Color grading and palette." },
  { id: "style", label: "@Style", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300", guidance: "Artistic style treatment." },
  { id: "texture", label: "@Texture", color: "bg-lime-500/15 text-lime-700 border-lime-400/40 dark:text-lime-300", guidance: "Surface texture detail." },
  { id: "material", label: "@Material", color: "bg-lime-500/15 text-lime-700 border-lime-400/40 dark:text-lime-300", guidance: "Material appearance." },
  { id: "composition", label: "@Composition", color: "bg-teal-500/15 text-teal-700 border-teal-400/40 dark:text-teal-300", guidance: "Framing and composition." },
  { id: "camera", label: "@Camera", color: "bg-teal-500/15 text-teal-700 border-teal-400/40 dark:text-teal-300", guidance: "Camera angle and lens feel." },
  { id: "depth", label: "@Depth", color: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40 dark:text-indigo-300", guidance: "Depth of field." },
  { id: "blur", label: "@Blur", color: "bg-indigo-500/15 text-indigo-700 border-indigo-400/40 dark:text-indigo-300", guidance: "Background or motion blur." },
  { id: "mood", label: "@Mood", color: "bg-purple-500/15 text-purple-700 border-purple-400/40 dark:text-purple-300", guidance: "Emotional mood of the scene." },
  { id: "weather", label: "@Weather", color: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300", guidance: "Weather conditions." },
  { id: "architecture", label: "@Architecture", color: "bg-slate-500/15 text-slate-700 border-slate-400/40 dark:text-slate-300", guidance: "Buildings and structures." },
  { id: "furniture", label: "@Furniture", color: "bg-stone-500/15 text-stone-700 border-stone-400/40 dark:text-stone-300", guidance: "Furniture elements." },
  { id: "vehicle", label: "@Vehicle", color: "bg-zinc-500/15 text-zinc-700 border-zinc-400/40 dark:text-zinc-300", guidance: "Vehicles." },
  { id: "animal", label: "@Animal", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300", guidance: "Animals." },
  { id: "product", label: "@Product", color: "bg-blue-500/15 text-blue-700 border-blue-400/40 dark:text-blue-300", guidance: "Product photography focus." },
  { id: "scene", label: "@Scene", color: "bg-sky-500/15 text-sky-700 border-sky-400/40 dark:text-sky-300", guidance: "Overall scene." },
  { id: "time", label: "@Time", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300", guidance: "Time of day." },
  { id: "season", label: "@Season", color: "bg-green-500/15 text-green-700 border-green-400/40 dark:text-green-300", guidance: "Seasonal context." },
  { id: "atmosphere", label: "@Atmosphere", color: "bg-violet-500/15 text-violet-700 border-violet-400/40 dark:text-violet-300", guidance: "Atmospheric effects." },
  { id: "reflection", label: "@Reflection", color: "bg-cyan-500/15 text-cyan-700 border-cyan-400/40 dark:text-cyan-300", guidance: "Reflections." },
  { id: "shadow", label: "@Shadow", color: "bg-slate-500/15 text-slate-700 border-slate-400/40 dark:text-slate-300", guidance: "Shadows." },
  { id: "details", label: "@Details", color: "bg-emerald-500/15 text-emerald-700 border-emerald-400/40 dark:text-emerald-300", guidance: "Fine detail enhancement." },
  { id: "restoration", label: "@Restoration", color: "bg-amber-500/15 text-amber-800 border-amber-400/40 dark:text-amber-300", guidance: "Photo restoration." },
  { id: "enhance", label: "@Enhance", color: "bg-primary/15 text-primary border-primary/40", guidance: "General quality enhancement." },
  { id: "remove", label: "@Remove", color: "bg-destructive/10 text-destructive border-destructive/30", guidance: "Removal / inpainting." },
  { id: "replace", label: "@Replace", color: "bg-orange-500/15 text-orange-700 border-orange-400/40 dark:text-orange-300", guidance: "Replace elements." },
  { id: "add", label: "@Add", color: "bg-green-500/15 text-green-700 border-green-400/40 dark:text-green-300", guidance: "Add new elements." },
] as const;

export type ContextTagId = (typeof CONTEXT_TAGS)[number]["id"];

export const MAX_CONTEXT_TAGS = 10;

/** Build structured prompt suffix from selected tag ids (frontend composition). */
export function composeTagGuidance(tagIds: string[]): string {
  const parts = tagIds
    .map((id) => CONTEXT_TAGS.find((t) => t.id === id)?.guidance)
    .filter(Boolean) as string[];
  if (parts.length === 0) return "";
  return `Context focus: ${parts.join(" ")}`;
}

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
  { label: "Remove people", prompt: "Remove every visible person from the image and reconstruct the background naturally." },
  { label: "Remove object", prompt: "Remove the unwanted object and inpaint the area so it blends with the surroundings." },
  { label: "Change background", prompt: "Replace the background with a clean professional studio backdrop while preserving the subject." },
  { label: "Enhance lighting", prompt: "Improve lighting and color balance for a polished natural look while preserving identity." },
] as const;

const COMPACT_IDEAS = EXAMPLE_PROMPTS.slice(0, 3);

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

  const contextHint =
    mediaType !== "image"
      ? null
      : totalImages >= 2
        ? `Editing ${totalImages} reference images`
        : totalImages === 1
          ? "Editing 1 image"
          : "Create from prompt";

  const atQuery = useMemo(() => extractAtQuery(prompt), [prompt]);

  const atMatches = useMemo(() => {
    if (!atQuery) return [];
    const q = atQuery.query;
    return CONTEXT_TAGS.filter(
      (t) =>
        !contextTags.includes(t.id) &&
        (t.id.startsWith(q) || t.label.toLowerCase().includes(`@${q}`)),
    ).slice(0, 8);
  }, [atQuery, contextTags]);

  useEffect(() => {
    setAtMenuOpen(!!atQuery && atMatches.length > 0 && mediaType === "image");
  }, [atQuery, atMatches.length, mediaType]);

  /** Select tag → floating chip only; strip @query from text; do not insert @Label into prompt. */
  const insertTag = (tagId: string) => {
    const tag = CONTEXT_TAGS.find((c) => c.id === tagId);
    if (!tag) return;

    if (!contextTags.includes(tagId) && contextTags.length >= MAX_CONTEXT_TAGS) {
      toast.message(`Maximum ${MAX_CONTEXT_TAGS} tags`);
      return;
    }

    // Remove trailing @query from the typed prompt
    setPrompt((prev) => {
      const info = extractAtQuery(prev);
      if (!info) return prev;
      const before = prev.slice(0, info.start);
      const after = prev.slice(info.start + 1 + info.query.length);
      return `${before}${after}`.replace(/\s{2,}/g, " ");
    });

    if (onToggleTag && !contextTags.includes(tagId)) {
      onToggleTag(tagId);
    }
    setAtMenuOpen(false);
    requestAnimationFrame(() => taRef.current?.focus());
  };

  const removeChip = (id: string) => {
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
          {/* Floating selected tags + mode hint — no permanent tag library row */}
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2">
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

          <div className="relative min-w-0 px-2.5 pt-1 pb-1.5 sm:px-3 sm:pb-2">
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
                className="absolute left-2 right-2 z-20 mt-0.5 max-h-44 overflow-y-auto rounded-lg border border-border/80 bg-popover p-1 shadow-lg sm:left-3 sm:right-14"
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
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-muted"
                  >
                    <span className={cn("rounded-full border px-1.5 py-0.5 text-[10px]", tag.color)}>
                      {tag.label}
                    </span>
                    <span className="truncate text-[10px] font-normal text-muted-foreground">
                      {tag.guidance}
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
