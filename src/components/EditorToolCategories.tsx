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
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
};

type Category = {
  id: string;
  label: string;
  tools: Tool[];
};

/**
 * Common image-edit tools grouped for progressive disclosure.
 * Selecting a tool fills the prompt — generation still uses the existing pipeline.
 */
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
        icon: Wand2,
        prompt:
          "Blur only the background with a natural shallow depth of field. Keep the subject sharp and unchanged.",
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
        id: "hdr",
        label: "HDR look",
        icon: Sun,
        prompt:
          "Apply a high-dynamic-range look with expanded highlights and shadows, punchy micro-contrast and natural colors. Keep the subject unchanged.",
      },
      {
        id: "cinematic",
        label: "Cinematic",
        icon: Sun,
        prompt:
          "Apply a cinematic color grade with teal-and-orange tones, filmic contrast and subtle grain while keeping the original subject unchanged.",
      },
    ],
  },
  {
    id: "portrait",
    label: "Portrait",
    tools: [
      {
        id: "face-enhance",
        label: "Enhance face",
        icon: Users,
        prompt:
          "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age.",
      },
      {
        id: "skin",
        label: "Skin retouch",
        icon: Sparkles,
        prompt:
          "Retouch the skin naturally: remove blemishes, keep pores and realistic texture. Do not change identity.",
      },
    ],
  },
  {
    id: "clothing",
    label: "Clothing",
    tools: [
      {
        id: "outfit",
        label: "Change outfit",
        icon: Shirt,
        prompt:
          "Change only the clothing/outfit as described. Keep the exact same face, identity, pose and background.",
      },
    ],
  },
  {
    id: "style",
    label: "Style",
    tools: [
      {
        id: "cartoon",
        label: "Cartoon",
        icon: Wand2,
        prompt:
          "Convert to a vibrant cartoon illustration with bold outlines while keeping the subject's identity, pose and framing.",
      },
      {
        id: "vintage",
        label: "Vintage",
        icon: Wand2,
        prompt:
          "Apply a vintage 1970s film look with warm tones and soft grain while keeping the subject sharp and recognizable.",
      },
    ],
  },
];

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  /** When true, show tools that need an uploaded image first */
  hasImage?: boolean;
};

export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  const [active, setActive] = useState<string>("edit");
  const cat = EDITOR_TOOL_CATEGORIES.find((c) => c.id === active) ?? EDITOR_TOOL_CATEGORIES[0];

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Choose a tool
        </p>
        <p className="text-[11px] text-muted-foreground">Edit · Background · Enhance · Portrait · Clothing · Style</p>
      </div>
      {/* Category tabs */}
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
      {/* Tools in active category — icon + label, never emoji */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cat.tools.map((t) => {
          const Icon = t.icon;
          const needsImage = t.id !== "cartoon" && t.id !== "vintage";
          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled || (needsImage && !hasImage)}
              onClick={() => onSelectTool(t)}
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
      {!hasImage && (
        <p className="text-[11px] text-muted-foreground">
          Upload an image to unlock most edit tools. Style tools and text-to-image work without an upload.
        </p>
      )}
    </div>
  );
}
