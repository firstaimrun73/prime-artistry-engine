import { Palette, Shirt, Sparkles, Wand2, type LucideIcon } from "lucide-react";

type StyleTool = {
  id: string;
  label: string;
  icon: LucideIcon;
  prompt: string;
  /** Style tools may work without an upload (text-to-image). */
  needsImage?: boolean;
};

/** Model/generation-oriented styles — still use existing FAL edit/generate path. */
export const STYLE_TOOLS: StyleTool[] = [
  {
    id: "headshot",
    label: "AI Headshot",
    icon: Sparkles,
    prompt:
      "Transform this into a professional corporate headshot with clean studio lighting, neutral background and sharp business attire while preserving the person's exact face and identity.",
    needsImage: true,
  },
  {
    id: "avatar",
    label: "AI Avatar",
    icon: Sparkles,
    prompt:
      "Create a polished stylised profile avatar of the person with clean lighting and a simple background, preserving their exact facial identity.",
    needsImage: true,
  },
  {
    id: "anime",
    label: "Anime",
    icon: Wand2,
    prompt:
      "Convert to a polished anime illustration style while keeping the subject's identity and pose.",
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
    id: "cinematic",
    label: "Cinematic",
    icon: Palette,
    prompt:
      "Apply a cinematic color grade with teal-and-orange tones, filmic contrast and subtle grain while keeping the original subject unchanged.",
    needsImage: true,
  },
  {
    id: "oil",
    label: "Oil painting",
    icon: Palette,
    prompt:
      "Repaint this as a classical oil painting with rich brush strokes, layered color and canvas texture.",
    needsImage: false,
  },
  {
    id: "watercolor",
    label: "Watercolor",
    icon: Palette,
    prompt:
      "Repaint this as a soft watercolor illustration with translucent washes, wet edges and paper texture.",
    needsImage: false,
  },
  {
    id: "pencil",
    label: "Pencil sketch",
    icon: Wand2,
    prompt:
      "Convert this into a detailed hand-drawn pencil sketch with realistic graphite shading, cross-hatching and paper texture.",
    needsImage: false,
  },
  {
    id: "3d",
    label: "3D render",
    icon: Wand2,
    prompt:
      "Reimagine this as a stylised 3D render with soft global illumination, subtle subsurface scattering and clean studio lighting.",
    needsImage: false,
  },
  {
    id: "outfit",
    label: "Change outfit",
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

export function StyleToolGrid({ hasImage, disabled, onPrompt }: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Styles & models
      </p>
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
              className="flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
              <span className="leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Styles use the Motio2edit generation pipeline. Refine with the prompt if needed.
      </p>
    </div>
  );
}
