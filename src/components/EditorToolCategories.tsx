import { useState } from "react";
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

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
  /** UI-only tools that do not fill a generation prompt (e.g. local crop). */
  uiOnly?: boolean;
};

type Category = {
  id: string;
  label: string;
  tools: Tool[];
};

/**
 * Common image-edit tools grouped for progressive disclosure.
 * Selecting a tool fills the prompt — generation still uses the existing pipeline.
 * Auto Edit is a UI entry only (no backend algorithm in this module).
 * Tools marked uiOnly are architecture hooks (e.g. Crop) without fake generation.
 */
export const AUTO_EDIT_PROMPT =
  "Automatically analyze this image and apply professional improvements: enhance clarity and detail, balance exposure and color, reduce noise, and polish the overall look while keeping the subject[...]";

export const EDITOR_TOOL_CATEGORIES: Category[] = [
  {
    id: "edit",
    label: "Edit",
    tools: [
      {
        id: "remove-object",
        label: "Remove object",
        icon: Eraser,
        prompt:
          "Remove the unwanted object completely and reconstruct the background naturally with matching textures, lighting and perspective. Keep the main subject identical.",
      },
      {
        id: "circle-remove",
        label: "Circle to Remove",
        icon: Eraser,
        prompt: "__CIRCLE_REMOVE__",
      },
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
        id: "crop",
        label: "Crop",
        icon: Crop,
        prompt: "__CROP__",
        uiOnly: true,
      },
      {
        id: "expand",
        label: "Expand / Outpaint",
        icon: Maximize2,
        prompt:
          "Expand the canvas outward and naturally continue the scene beyond the current edges. Match style, lighting and perspective. Keep the original subject unchanged.",
      },
      {
        id: "rotate",
        label: "Straighten",
        icon: RotateCcw,
        prompt:
          "Straighten the horizon and correct any tilt. Keep the subject and composition otherwise identical.",
      },
      {
        id: "flip",
        label: "Flip",
        icon: FlipHorizontal,
        prompt:
          "Mirror this image horizontally while keeping quality and details intact.",
      },
    ],
  },
  {
    id: "background",
    label: "Background",
    tools: [
      {
        id: "remove-bg",
        label: "Remove background",
        icon: Layers,
        prompt:
          "Remove the background cleanly and replace it with a soft neutral studio backdrop while keeping the main subject's edges, hair detail and identity perfectly intact.",
      },
      {
        id: "replace-bg",
        label: "Replace background",
        icon: Layers,
        prompt:
          "Replace only the background with a new scene. Keep the subject pixel-perfect identical with clean edges.",
      },
      {
        id: "blur-bg",
        label: "Blur background",
        icon: Focus,
        prompt:
          "Blur only the background with a natural shallow depth of field. Keep the subject sharp and unchanged.",
      },
      {
        id: "extend-bg",
        label: "Extend background",
        icon: Maximize2,
        prompt:
          "Extend the background outward while keeping the main subject fixed and unchanged.",
      },
      {
        id: "clean-bg",
        label: "Clean background",
        icon: Wand2,
        prompt:
          "Clean and simplify the background: remove clutter and distractions while keeping the subject identical.",
      },
    ],
  },
  {
    id: "enhance",
    label: "Enhance",
    tools: [
      {
        id: "enhance",
        label: "Enhance quality",
        icon: Sparkles,
        prompt:
          "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition, subject and colors identical.",
      },
      {
        id: "upscale",
        label: "AI Upscale",
        icon: Maximize2,
        prompt:
          "Upscale and enhance resolution with natural detail recovery. Keep the subject, composition and colors identical.",
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
        prompt:
          "Reduce noise and grain while keeping fine detail and natural skin texture.",
      },
      {
        id: "hdr",
        label: "HDR Enhancement",
        icon: Sun,
        prompt:
          "Apply a high-dynamic-range look with expanded highlights and shadows, punchy micro-contrast and natural colors. Keep the subject unchanged.",
      },
      {
        id: "fix-lighting",
        label: "Fix lighting",
        icon: Sun,
        prompt:
          "Balance exposure and lighting: recover shadows and highlights naturally without changing the subject.",
      },
      {
        id: "fix-exposure",
        label: "Fix exposure",
        icon: Sun,
        prompt:
          "Correct under- or over-exposure for a balanced, natural look. Keep composition identical.",
      },
      {
        id: "restore",
        label: "Restore photo",
        icon: Sparkles,
        prompt:
          "Restore this photo: repair scratches, fade and damage while preserving the original look and subjects.",
      },
      {
        id: "color-correct",
        label: "Color correction",
        icon: Palette,
        prompt:
          "Correct white balance and colors for a natural, true-to-life look. Keep the subject unchanged.",
      },
      {
        id: "colorize",
        label: "Colorize",
        icon: Palette,
        prompt:
          "Colorize this image with realistic, period-appropriate colors while keeping structure identical.",
      },
      {
        id: "artifacts",
        label: "Reduce artifacts",
        icon: Wand2,
        prompt:
          "Reduce compression artifacts and blockiness while preserving detail and identity.",
      },
    ],
  },
  {
    id: "portrait",
    label: "Portrait",
    tools: [
      {
        id: "face-enhance",
        label: "Face enhancement",
        icon: Users,
        prompt:
          "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age.",
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
        id: "eye-enhance",
        label: "Eye enhancement",
        icon: Focus,
        prompt:
          "Sharpen and brighten the eyes naturally. Do not change eye color or identity.",
      },
      {
        id: "hair",
        label: "Hair enhancement",
        icon: Wand2,
        prompt:
          "Enhance hair detail and shine naturally without changing hairstyle or color dramatically.",
      },
      {
        id: "portrait-light",
        label: "Lighting correction",
        icon: Sun,
        prompt:
          "Improve portrait lighting for flattering, natural face illumination. Keep identity identical.",
      },
      {
        id: "red-eye",
        label: "Red eye correction",
        icon: Focus,
        prompt:
          "Remove red-eye from the pupils while keeping natural eye color and identity.",
      },
    ],
  },
  {
    id: "clothing",
    label: "Clothing",
    tools: [
      {
        id: "outfit",
        label: "Change clothing",
        icon: Shirt,
        prompt:
          "Change only the clothing/outfit as described. Keep the exact same face, identity, pose and background.",
      },
      {
        id: "replace-outfit",
        label: "Replace outfit",
        icon: Shirt,
        prompt:
          "Replace the full outfit with the described clothing. Keep face, body proportions and background identical.",
      },
      {
        id: "clothing-color",
        label: "Clothing color",
        icon: Palette,
        prompt:
          "Change only the clothing color as described. Keep fabric texture, fit, face and background identical.",
      },
      {
        id: "clothing-style",
        label: "Clothing style",
        icon: Shirt,
        prompt:
          "Restyle the clothing while keeping the same person, pose and background.",
      },
    ],
  },
  {
    id: "style",
    label: "Style",
    tools: [
      {
        id: "style-transfer",
        label: "Style transfer",
        icon: Wand2,
        prompt:
          "Apply an artistic style transfer while keeping the subject's identity and pose recognizable.",
      },
      {
        id: "cinematic",
        label: "Cinematic",
        icon: Sun,
        prompt:
          "Apply a cinematic color grade with teal-and-orange tones, filmic contrast and subtle grain while keeping the original subject unchanged.",
      },
      {
        id: "anime",
        label: "Anime",
        icon: Wand2,
        prompt:
          "Convert to a polished anime illustration style while keeping the subject's identity and pose.",
      },
      {
        id: "illustration",
        label: "Illustration",
        icon: Palette,
        prompt:
          "Convert to a clean digital illustration while keeping composition and subject identity.",
      },
      {
        id: "product",
        label: "Product photography",
        icon: Sparkles,
        prompt:
          "Restyle as clean product photography with studio lighting and a simple backdrop. Keep the product form accurate.",
      },
      {
        id: "film-look",
        label: "Film look",
        icon: Sun,
        prompt:
          "Apply a classic film look with natural grain and soft contrast. Keep the subject sharp and recognizable.",
      },
      {
        id: "vintage",
        label: "Vintage",
        icon: Wand2,
        prompt:
          "Apply a vintage 1970s film look with warm tones and soft grain while keeping the subject sharp and recognizable.",
      },
      {
        id: "bw",
        label: "Black & White",
        icon: Palette,
        prompt:
          "Convert to a rich black-and-white photograph with strong tonal range. Keep composition identical.",
      },
      {
        id: "cartoon",
        label: "Cartoon",
        icon: Wand2,
        prompt:
          "Convert to a vibrant cartoon illustration with bold outlines while keeping the subject's identity, pose and framing.",
      },
    ],
  },
];

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  const [active, setActive] = useState<string>("edit");
  const cat = EDITOR_TOOL_CATEGORIES.find((c) => c.id === active) ?? EDITOR_TOOL_CATEGORIES[0];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      {/* Auto Edit — UI entry only for ALL plans; fills enhance prompt via existing pipeline */}
      <button
        type="button"
        disabled={disabled || !hasImage}
        onClick={() =>
          onSelectTool({
            id: "auto-edit",
            label: "Auto Edit",
            icon: Sparkles,
            prompt: AUTO_EDIT_PROMPT,
          })
        }
        className="flex w-full min-h-[48px] items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2.5 text-left transition-colors hover:bg-primary/10 disabled:opacity-50"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary">Auto Edit ✨</span>
          <span className="block text-[11px] text-muted-foreground leading-snug">
            Let Motio2edit analyze your image and automatically improve it.
          </span>
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Choose a tool</p>
        <p className="text-[11px] text-muted-foreground">Edit · Background · Enhance · Portrait · Clothing · Style</p>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EDITOR_TOOL_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => setActive(c.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
              active === c.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cat.tools.map((t) => {
          const Icon = t.icon;
          const styleOnly = t.id === "cartoon" || t.id === "vintage" || t.id === "anime" || t.id === "illustration" || t.id === "bw";
          const needsImage = !styleOnly;
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled || (needsImage && !hasImage)}
              onClick={() => onSelectTool(t)}
              className="flex items-center gap-2 min-h-[48px] rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
      {!hasImage && (
        <p className="text-[11px] text-muted-foreground">
          Upload an image to unlock Auto Edit and most tools. Style tools and text-to-image work without an upload.
        </p>
      )}
    </div>
  );
}
