import { Eraser } from "lucide-react";
import { PriorityToolGrid } from "@/components/editor/features/PriorityToolGrid";

type Tool = {
  id: string;
  label: string;
  icon: typeof Eraser;
  prompt: string;
  uiOnly?: boolean;
};

type Props = {
  onSelectTool: (tool: Tool) => void;
  disabled?: boolean;
  hasImage?: boolean;
};

/**
 * Image Editor tool strip — Circle to Remove only for now.
 * Other tools/styles removed from UI until redesigned.
 */
export function EditorToolCategories({ onSelectTool, disabled, hasImage }: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 sm:p-4">
      <PriorityToolGrid
        hasImage={hasImage}
        disabled={disabled}
        onPrompt={() => {
          /* prompt tools disabled */
        }}
        onCircleRemove={() =>
          onSelectTool({
            id: "circle-remove",
            label: "Circle to Remove",
            icon: Eraser,
            prompt: "__CIRCLE_REMOVE__",
          })
        }
        onCrop={() => {
          /* crop removed from tools UI */
        }}
      />

      {!hasImage && (
        <p className="text-[11px] text-muted-foreground">Upload an image first to unlock Circle to Remove.</p>
      )}
    </div>
  );
}
