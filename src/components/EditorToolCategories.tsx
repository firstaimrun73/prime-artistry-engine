import { Crop, Eraser, Wand2, Palette } from "lucide-react";
import { PriorityToolGrid } from "@/components/editor/features/PriorityToolGrid";
import { StyleToolGrid } from "@/components/editor/features/StyleToolGrid";

type Tool = {
  id: string;
  label: string;
  icon: typeof Wand2;
  prompt: string;
  uiOnly?: boolean;
};

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

/**
 * Image Editor tool categories only.
 * Motio2edit Auto is a separate standalone product at /studio/image/auto-edit —
 * not an in-editor mode or tool.
 */
export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
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
