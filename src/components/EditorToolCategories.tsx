import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Eraser,
  Layers,
  Sparkles,
  Users,
  Sun,
  Shirt,
  ImagePlus,
  Wand2,
  Crop,
  Maximize2,
  RotateCcw,
  FlipHorizontal,
  Focus,
  Palette,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PriorityToolGrid } from "@/components/editor/features/PriorityToolGrid";
import { StyleToolGrid } from "@/components/editor/features/StyleToolGrid";

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
  uiOnly?: boolean;
};

type Category = {
  id: string;
  label: string;
  tools: Tool[];
};

export const AUTO_EDIT_PROMPT =
  "Automatically analyze this image and apply professional improvements: enhance clarity and detail, balance exposure and color, reduce noise, and polish the overall look while keeping the subject identical.";

/** Secondary / more tools (not shown as a wall of primary cards). */
export const EDITOR_TOOL_CATEGORIES: Category[] = [
  {
    id: "more-edit",
    label: "More edit",
    tools: [
      {
        id: "add-object",
        label: "Add object",
        icon: ImagePlus,
        prompt:
          "Add the described object into this photo naturally, matching lighting, perspective and shadows. Do not change the person or background otherwise.",
      },
      {
        id: "replace-object",
        label: "Replace object",
        icon: Wand2,
        prompt:
          "Replace the specified object with the described alternative. Match lighting, scale and perspective. Keep everything else identical.",
      },
      {
        id: "rotate",
        label: "Straighten",
        icon: RotateCcw,
        prompt: "Straighten the horizon and correct any tilt. Keep the subject and composition otherwise identical.",
      },
      {
        id: "flip",
        label: "Flip",
        icon: FlipHorizontal,
        prompt: "Mirror this image horizontally while keeping quality and details intact.",
      },
      {
        id: "blur-bg",
        label: "Blur background",
        icon: Focus,
        prompt:
          "Blur only the background with a natural shallow depth of field. Keep the subject sharp and unchanged.",
      },
      {
        id: "clean-bg",
        label: "Clean background",
        icon: Wand2,
        prompt:
          "Clean and simplify the background: remove clutter and distractions while keeping the subject identical.",
      },
      {
        id: "sharpen",
        label: "Sharpen",
        icon: Focus,
        prompt:
          "Sharpen fine detail and edges without introducing artifacts. Keep identity and composition identical.",
      },
      {
        id: "deblur",
        label: "Deblur",
        icon: Focus,
        prompt:
          "Reduce motion blur and soft focus while preserving natural texture. Keep the subject unchanged.",
      },
      {
        id: "denoise",
        label: "Denoise",
        icon: Sparkles,
        prompt: "Reduce noise and grain while keeping fine detail and natural skin texture.",
      },
      {
        id: "hdr",
        label: "HDR",
        icon: Sun,
        prompt:
          "Apply a high-dynamic-range look with expanded highlights and shadows, punchy micro-contrast and natural colors. Keep the subject unchanged.",
      },
      {
        id: "skin",
        label: "Skin smoothing",
        icon: Sparkles,
        prompt:
          "Retouch the skin naturally: remove blemishes, keep pores and realistic texture. Do not change identity.",
      },
      {
        id: "portrait-retouch",
        label: "Portrait retouch",
        icon: Users,
        prompt:
          "Professional portrait retouch: refine skin, eyes and lighting while keeping identity and expression identical.",
      },
      {
        id: "colorize",
        label: "Colorize",
        icon: Palette,
        prompt:
          "Colorize this image with realistic, period-appropriate colors while keeping structure identical.",
      },
      {
        id: "bw",
        label: "Black & White",
        icon: Palette,
        prompt:
          "Convert to a rich black-and-white photograph with strong tonal range. Keep composition identical.",
      },
      {
        id: "clothing-color",
        label: "Clothing color",
        icon: Shirt,
        prompt:
          "Change only the clothing color as described. Keep fabric texture, fit, face and background identical.",
      },
    ],
  },
];

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

/**
 * Tool entry for the Image Editor.
 * Priority: real feature controls → styles → collapsed more tools.
 * Circle to Remove / Auto Edit use dedicated routes.
 * Crop/circle still signal via __ markers for the editor handler.
 */
export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  const [showMore, setShowMore] = useState(false);
  const more = EDITOR_TOOL_CATEGORIES[0];

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <Link
        to="/studio/image/auto-edit"
        className={cn(
          "flex w-full min-h-[48px] items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10",
          (disabled || !hasImage) && "pointer-events-none opacity-50",
        )}
        onClick={(e) => {
          if (disabled || !hasImage) e.preventDefault();
        }}
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary">Auto Edit</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            Analyze → select improvements → apply (dedicated workspace)
          </span>
        </span>
      </Link>

      <PriorityToolGrid
        hasImage={hasImage}
        disabled={disabled}
        onPrompt={(prompt) => onSelectTool({ id: "priority", label: "tool", icon: Wand2, prompt })}
        onCircleRemove={() =>
          onSelectTool({ id: "circle-remove", label: "Circle to Remove", icon: Eraser, prompt: "__CIRCLE_REMOVE__" })
        }
        onCrop={() =>
          onSelectTool({ id: "crop", label: "Crop", icon: Crop, prompt: "__CROP__", uiOnly: true })
        }
      />

      <StyleToolGrid
        hasImage={hasImage}
        disabled={disabled}
        onPrompt={(prompt) => onSelectTool({ id: "style", label: "style", icon: Palette, prompt })}
      />

      <div className="space-y-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setShowMore((v) => !v)}
          className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {showMore ? "Hide more tools" : "More tools"}
        </button>
        {showMore && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {more.tools.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled || !hasImage}
                  onClick={() => onSelectTool(t)}
                  className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium hover:border-primary/50 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {!hasImage && (
        <p className="text-[11px] text-muted-foreground">
          Upload an image to unlock Auto Edit, Circle tools, and most edits.
        </p>
      )}
    </div>
  );
}
