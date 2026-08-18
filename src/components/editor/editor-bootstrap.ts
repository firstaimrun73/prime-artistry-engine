/**
 * One-shot bootstrap payload from /editor sessionStorage entry points.
 * Parsed by the thin authenticated route; consumed by ImageEditor or VideoEditor.
 */
export type EditorWorkspace = "image" | "video";

export type EditorBootstrap = {
  workspace: EditorWorkspace;
  /** Preset prompt from studio / tools */
  initialPrompt?: string;
  /** History → edit again URL */
  reuseUrl?: string;
  reuseKind?: "image" | "video";
  /** Open Smart Remove once image is ready */
  pendingSmartRemove?: boolean;
};
