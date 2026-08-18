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
};

function ToolButton({
  t,
  hasImage,
  disabled,
  onCircleRemove,
}: Props & { t: PriorityToolAction }) {
  const Icon = t.icon;
  const base =
    "flex min-h-[44px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-2 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-50";

  if (t.kind === "route" && t.mode === "remove") {
    return (
      <button
        type="button"
        disabled={disabled || !hasImage}
        className={base}
        onClick={() => onCircleRemove()}
      >
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="leading-tight">{t.label}</span>
      </button>
    );
  }

  return null;
}

export function PriorityToolGrid(props: Props) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tools</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRIORITY_CORE.map((t) => (
          <ToolButton key={t.id} t={t} {...props} />
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Paint the area to remove, then tap <strong>Remove</strong>. Generation starts automatically.
      </p>
    </div>
  );
}
