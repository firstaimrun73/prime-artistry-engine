import { Link } from "@tanstack/react-router";
import {
  Crop,
  Eraser,
  Layers,
  Maximize2,
  Sparkles,
  Sun,
  Users,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PriorityToolAction =
  | { kind: "prompt"; id: string; label: string; prompt: string; icon: LucideIcon }
  | { kind: "circle-remove"; id: string; label: string; icon: LucideIcon }
  | { kind: "crop"; id: string; label: string; icon: LucideIcon }
  | { kind: "route"; id: string; label: string; icon: LucideIcon; to: string };

/** Real-feature priority tools — prefer dedicated UI/routes over prompt chips. */
export const PRIORITY_TOOLS: PriorityToolAction[] = [
  {
    kind: "circle-remove",
    id: "circle-remove",
    label: "Circle to Remove",
    icon: Eraser,
  },
  {
    kind: "route",
    id: "circle-add",
    label: "Circle to Add",
    icon: Wand2,
    to: "/studio/image/circle-remove?mode=add",
  },
  {
    kind: "crop",
    id: "crop",
    label: "Crop",
    icon: Crop,
  },
  {
    kind: "prompt",
    id: "remove-bg",
    label: "Remove background",
    icon: Layers,
    prompt:
      "Remove the background cleanly and replace it with a soft neutral studio backdrop while keeping the main subject's edges, hair detail and identity perfectly intact.",
  },
  {
    kind: "prompt",
    id: "replace-bg",
    label: "Replace background",
    icon: Layers,
    prompt:
      "Replace only the background with a new scene. Keep the subject pixel-perfect identical with clean edges.",
  },
  {
    kind: "prompt",
    id: "remove-object",
    label: "Remove object",
    icon: Eraser,
    prompt:
      "Remove the unwanted object completely and reconstruct the background naturally with matching textures, lighting and perspective. Keep the main subject identical.",
  },
  {
    kind: "prompt",
    id: "remove-people",
    label: "Remove people",
    icon: Users,
    prompt:
      "Remove every visible person and human figure from the image, seamlessly reconstruct the background with matching texture, lighting and perspective.",
  },
  {
    kind: "prompt",
    id: "expand",
    label: "Expand / Outpaint",
    icon: Maximize2,
    prompt:
      "Expand the canvas outward and naturally continue the scene beyond the current edges. Match style, lighting and perspective. Keep the original subject unchanged.",
  },
  {
    kind: "prompt",
    id: "generative-fill",
    label: "Generative fill",
    icon: Wand2,
    prompt:
      "Extend and fill the empty areas of the image with content that matches the existing scene in style, lighting and perspective.",
  },
  {
    kind: "prompt",
    id: "enhance",
    label: "Enhance",
    icon: Sparkles,
    prompt:
      "Enhance this photo: increase sharpness, clarity and fine detail, reduce noise. Keep composition, subject and colors identical.",
  },
  {
    kind: "prompt",
    id: "upscale",
    label: "AI Upscale",
    icon: Maximize2,
    prompt:
      "Upscale and enhance resolution with natural detail recovery. Keep the subject, composition and colors identical.",
  },
  {
    kind: "prompt",
    id: "restore",
    label: "Restore",
    icon: Sparkles,
    prompt:
      "Restore this photo: repair scratches, fade and damage while preserving the original look and subjects.",
  },
  {
    kind: "prompt",
    id: "relight",
    label: "Relight",
    icon: Sun,
    prompt:
      "Relight the scene with soft, cinematic key lighting, gentle fill and a subtle rim light, keeping the subject and composition unchanged.",
  },
  {
    kind: "prompt",
    id: "color-correct",
    label: "Color correction",
    icon: Wand2,
    prompt:
      "Correct white balance and colors for a natural, true-to-life look. Keep the subject unchanged.",
  },
  {
    kind: "prompt",
    id: "face-enhance",
    label: "Face enhance",
    icon: Users,
    prompt:
      "Enhance facial detail with natural skin texture, sharp eyes and balanced lighting. Do NOT change identity, expression or age.",
  },
];

type Props = {
  hasImage?: boolean;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
  onCircleRemove: () => void;
  onCrop: () => void;
};

export function PriorityToolGrid({
  hasImage,
  disabled,
  onPrompt,
  onCircleRemove,
  onCrop,
}: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Primary tools
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {PRIORITY_TOOLS.map((t) => {
          const Icon = t.icon;
          const base =
            "flex min-h-[48px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50";

          if (t.kind === "route") {
            return (
              <Link
                key={t.id}
                to="/studio/image/circle-remove"
                search={{ mode: t.id === "circle-add" ? "add" : "remove" } as never}
                className={cn(base, (disabled || !hasImage) && "pointer-events-none opacity-50")}
              >
                <Icon className="h-4 w-4 shrink-0 text-primary" />
                <span className="leading-tight">{t.label}</span>
              </Link>
            );
          }

          return (
            <button
              key={t.id}
              type="button"
              disabled={disabled || !hasImage}
              className={base}
              onClick={() => {
                if (t.kind === "circle-remove") onCircleRemove();
                else if (t.kind === "crop") onCrop();
                else if (t.kind === "prompt") onPrompt(t.prompt);
              }}
            >
              <Icon className="h-4 w-4 shrink-0 text-primary" />
              <span className="leading-tight">{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
