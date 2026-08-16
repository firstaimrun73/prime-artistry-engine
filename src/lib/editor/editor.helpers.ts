// Stages depend on whether an image is being edited.
export function getEditorStages(hasImage: boolean): string[] {
  return hasImage
    ? [
        "Understanding your prompt",
        "Analyzing image details",
        "Planning AI edits",
        "Applying advanced enhancements",
        "Creating final masterpiece",
      ]
    : [
        "Understanding your prompt",
        "Building enhanced prompt",
        "Composing the scene",
        "Applying advanced enhancements",
        "Creating final masterpiece",
      ];
}