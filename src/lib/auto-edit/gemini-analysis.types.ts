/** Structured Gemini analysis result for Auto Edit. */

export type GeminiAutoEditAnalysis = {
  image_type: string;
  issues: string[];
  recommended_actions: string[];
  crop_needed: boolean;
  crop_instruction: string;
  restoration_needed: boolean;
  color_restoration_needed: boolean;
  face_improvement_needed: boolean;
  background_cleanup_needed: boolean;
  distractions_to_remove: string[];
  composition_adjustments: string[];
  preserve_elements: string[];
  confidence: number;
  /** When true, skip Kontext and charge 0. */
  no_change: boolean;
  /** Prompt sent to fal-ai/flux-kontext-lora. */
  final_edit_prompt: string;
};
