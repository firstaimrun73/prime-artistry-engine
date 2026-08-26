import { Eraser, type LucideIcon } from "lucide-react";

export type PriorityToolAction =
  | { kind: "prompt"; id: string; label: string; prompt: string; icon: LucideIcon }
  | { kind: "crop"; id: string; label: string; icon: LucideIcon }
  | { kind: "route"; id: string; label: string; icon: LucideIcon; mode: "remove" | "add" };

/** Only Circle to Remove is exposed in the Image Editor tool strip for now. */
export const PRIORITY_CORE: PriorityToolAction[] = [
  { kind: "route", id: "circle-remove", label: "Circle to Remove", icon: Eraser, mode: "remove" },
];

/** Secondary tools hidden until redesigned — do not show in UI. */
export const PRIORITY_MORE: PriorityToolAction[] = [];

type Props = {
  hasImage?: boolean;
  disabled?: boolean;
  onPrompt: (prompt: string) => void;
  onCircleRemove: () => void;
  onCrop: () => void;
  /** Display-only credit hint (e.g. 25). */
  circleCredits?: number;
};

function ToolButton({
  t,
  hasImage,
  disabled,
  onCircleRemove,
  circleCredits = 25,
}: Props & { t: PriorityToolAction }) {
  const Icon = t.icon;
  const base =
    "flex min-h-[40px] items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50";

  if (t.kind === "route" && t.mode === "remove") {
    return (
      <button
        type="button"
        disabled={disabled || !hasImage}
        className={base}
        onClick={() => onCircleRemove()}
        title={!hasImage ? "Upload an image first" : undefined}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="leading-tight">{t.label}</span>
        <span className="ml-auto tabular-nums text-[10px] font-semibold text-muted-foreground">
          {circleCredits} credits
        </span>
      </button>
    );
  }

  return null;
}

export function PriorityToolGrid(props: Props) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-2 sm:max-w-sm">
        {PRIORITY_CORE.map((t) => (
          <ToolButton key={t.id} t={t} {...props} />
        ))}
      </div>
    </div>
  );
}
