import { Crop, Eraser, Sparkles, Wand2, Palette } from "lucide-react";
import { PriorityToolGrid } from "@/components/editor/features/PriorityToolGrid";
import { StyleToolGrid } from "@/components/editor/features/StyleToolGrid";

type Tool = {
  id: string;
  label: string;
  icon: typeof Wand2;
  prompt: string;
  uiOnly?: boolean;
};

/** Sentinel for in-editor Auto — parent runs analysis pipeline, never fills prompt bar. */
export const AUTO_EDIT_SENTINEL = "__AUTO_EDIT__";

/** @deprecated Prefer AUTO_EDIT_SENTINEL */
export const AUTO_EDIT_PROMPT = AUTO_EDIT_SENTINEL;

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <button
        type="button"
        disabled={disabled || !hasImage}
        onClick={() =>
          onSelectTool({
            id: "auto",
            label: "Auto",
            icon: Sparkles,
            prompt: AUTO_EDIT_SENTINEL,
          })
        }
        className="flex w-full min-h-[44px] items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10 disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-primary">Auto</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            Analyze this image · optional prompt · stays in editor
          </span>
        </span>
      </button>

      <PriorityToolGrid
        hasImage={hasImage}
        disabled={disabled}
        onPrompt={(prompt) =>
          onSelectTool({ id: "priority", label: "tool", icon: Wand2, prompt })
        }
        onCircleRemove={() =>
          onSelectTool({
            id: "circle-remove",
            label: "Circle to Remove",
            icon: Eraser,
            prompt: "__CIRCLE_REMOVE__",
          })
        }
        onCrop={() =>
          onSelectTool({ id: "crop", label: "Crop", icon: Crop, prompt: "__CROP__", uiOnly: true })
        }
      />

      <StyleToolGrid
        hasImage={hasImage}
        disabled={disabled}
        onPrompt={(prompt) =>
          onSelectTool({ id: "style", label: "style", icon: Palette, prompt })
        }
      />

      {!hasImage && (
        <p className="text-[11px] text-muted-foreground">Upload an image first to unlock edit tools.</p>
      )}
    </div>
  );
}
