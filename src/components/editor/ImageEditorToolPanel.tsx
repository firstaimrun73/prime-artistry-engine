import { useState } from "react";
import { toast } from "sonner";
import { EditorToolCategories } from "@/components/EditorToolCategories";
import { ImageCropModal } from "@/components/ImageCropModal";

type Tool = {
  id: string;
  label: string;
  prompt: string;
  uiOnly?: boolean;
};

type Props = {
  hasImage: boolean;
  /** Current working image (data URL or https) used for crop source */
  imageSrc: string | null;
  disabled?: boolean;
  /** Structured tool op — parent must NOT dump this into the visible prompt field */
  onPrompt: (prompt: string, meta?: { label: string; id: string }) => void;
  /** Open existing SmartRemoveModal */
  onCircleRemove: () => void;
  /** Replace working image after crop Apply — does not call generation */
  onCropApplied: (croppedDataUrl: string) => void;
};

/**
 * Image Editor tool strip: categories + Circle to Remove + Crop modal.
 * Crop is client-side only; generation still uses the existing pipeline.
 */
export function ImageEditorToolPanel({
  hasImage,
  imageSrc,
  disabled,
  onPrompt,
  onCircleRemove,
  onCropApplied,
}: Props) {
  const [cropOpen, setCropOpen] = useState(false);

  const handleSelect = (tool: Tool) => {
    if (tool.prompt === "__CIRCLE_REMOVE__" || tool.id === "circle-remove") {
      if (!hasImage) {
        toast.error("Upload an image first to use Circle to Remove.");
        return;
      }
      onCircleRemove();
      return;
    }

    if (tool.prompt === "__CROP__" || tool.id === "crop") {
      if (!hasImage || !imageSrc) {
        toast.error("Upload an image first to crop.");
        return;
      }
      setCropOpen(true);
      return;
    }

    // Internal UI markers must not leak into the prompt field
    if (tool.prompt.startsWith("__")) return;

    onPrompt(tool.prompt, { label: tool.label, id: tool.id });
  };

  return (
    <>
      <EditorToolCategories hasImage={hasImage} disabled={disabled} onSelectTool={handleSelect} />

      {imageSrc ? (
        <ImageCropModal
          open={cropOpen}
          imageSrc={imageSrc}
          onClose={() => setCropOpen(false)}
          onApply={(cropped) => {
            onCropApplied(cropped);
            setCropOpen(false);
            toast.success("Crop applied — this image will be used for generation.");
          }}
        />
      ) : null}
    </>
  );
}
