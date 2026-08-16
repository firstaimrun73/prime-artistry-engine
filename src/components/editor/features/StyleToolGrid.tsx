import { useState } from "react";
import { Palette, Shirt, Sparkles, Wand2, type LucideIcon } from "lucide-react";

type StyleTool = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
  needsImage?: boolean;
};

export const STYLE_TOOLS: StyleTool[] = [
  {
    id: "headshot",
    label: "Headshot",
    icon: Sparkles,
    prompt:
      "Transform this into a professional corporate headshot with clean studio lighting, neutral background and sharp business attire while preserving the person's exact face and identity.",
    needsImage: true,
  },
  {
    id: "cinematic",
    label: "Cinematic",
    icon: Palette,
    prompt:
      "Apply a cinematic color grade with teal-and-orange tones, filmic contrast and subtle grain while keeping the original subject unchanged.",
    needsImage: true,
  },
  {
    id: "anime",
    label: "Anime",
    icon: Wand2,
    prompt: "Convert to a polished anime illustration style while keeping the subject's identity and pose.",
    needsImage: false,
  },
  {
    id: "cartoon",
    label: "Cartoon",
    icon: Wand2,
    prompt:
      "Convert to a vibrant cartoon illustration with bold outlines while keeping the subject's identity, pose and framing.",
    needsImage: false,
  },
  {
    id: "oil",
    label: "Oil paint",
    icon: Palette,
    prompt:
      "Repaint this as a classical oil painting with rich brush strokes, layered color and canvas texture.",
    needsImage: false,
  },
  {
    id: "outfit",
    label: "Outfit",
    icon: Shirt,
    prompt:
      "Change only the clothing/outfit as described. Keep the exact same face, identity, pose and background.",
    needsImage: true,
  },
];

type Props = {
  hasImage?: boolean;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
};

/** Styles stay collapsed by default — secondary to real edit tools. */
export function StyleToolGrid({ hasImage, disabled, onPrompt }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        {open ? "Hide styles ▴" : "Styles & looks ▾"}
      </button>
      {open && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {STYLE_TOOLS.map((t) => {
              const Icon = t.icon;
              const needs = t.needsImage !== false;
              return (
                <button
                  key={t.id}
                  type="button"
                  disabled={disabled || (needs && !hasImage)}
                  onClick={() => onPrompt(t.prompt)}
                  className="flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-left text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="leading-tight">{t.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground">
            Styles fill the prompt for the existing generation pipeline. Refine before generating.
          </p>
        </>
      )}
    </div>
  );
}
