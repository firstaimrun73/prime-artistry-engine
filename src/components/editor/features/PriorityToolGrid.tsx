import type { LucideIcon } from "lucide-react";

export type PriorityToolAction =
  | { kind: "prompt"; id: string; label: string; prompt: string; icon: LucideIcon }
  | { kind: "crop"; id: string; label: string; icon: LucideIcon }
  | { kind: "route"; id: string; label: string; icon: LucideIcon; mode: "remove" | "add" };

/**
 * Image Studio no longer exposes Circle tools in the prompt strip.
 * Circle 2edit lives at /studio/image/circle-remove as a standalone product.
 */
export const PRIORITY_CORE: PriorityToolAction[] = [];
export const PRIORITY_MORE: PriorityToolAction[] = [];

type Props = {
  hasImage?: boolean;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
  onCircleRemove: () => void;
  onCrop: () => void;
  circleCredits?: number;
};

export function PriorityToolGrid(_props: Props) {
  return null;
}
