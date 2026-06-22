// Client-safe types and constants for the editor UI.
// No AI SDK imports here, so this module is safe to import in the browser.

export type EditMode = "image" | "video";

export interface ExpandedIntent {
  professionalPrompt: string;
  negativePrompt: string;
  strength: number;
  guidanceScale: number;
  steps: number;
  style: string;
  motionGuidance?: string;
  durationSeconds?: number;
}

export interface EditSessionState {
  sourceFile: File | null;
  sourceUrl: string | null;
  sourcePreviewUrl: string | null;
  userPrompt: string;
  expandedIntent: ExpandedIntent | null;
  outputUrl: string | null;
  jobId: string | null;
  status: "idle" | "uploading" | "processing" | "done" | "error";
  errorMessage: string | null;
  creditsUsed: number;
  mode: EditMode;
  videoDurationSeconds: number;
}

export const INITIAL_EDIT_SESSION: EditSessionState = {
  sourceFile: null,
  sourceUrl: null,
  sourcePreviewUrl: null,
  userPrompt: "",
  expandedIntent: null,
  outputUrl: null,
  jobId: null,
  status: "idle",
  errorMessage: null,
  creditsUsed: 0,
  mode: "image",
  videoDurationSeconds: 8,
};

export const CREDIT_COSTS = {
  image_edit: 2,
  image_enhance: 3,
  image_generate: 5,
  video_5s: 10,
  video_8s: 15,
  video_12s: 22,
  video_16s: 30,
} as const;

export type CreditOperation = keyof typeof CREDIT_COSTS;
