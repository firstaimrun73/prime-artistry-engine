/**
 * Validation for standalone Auto Edit — single image only.
 */

import { AUTO_EDIT_CONFIG, SUPPORTED_IMAGE_TYPES } from "./config";

export type AutoEditValidationOk = { ok: true; imageUrl: string };
export type AutoEditValidationErr = { ok: false; error: string };

export function validateStandaloneAutoEditInput(input: {
  imageUrl?: string;
}): AutoEditValidationOk | AutoEditValidationErr {
  const url = input.imageUrl?.trim() ?? "";
  if (!url) return { ok: false, error: "Upload one image first." };
  if (!url.startsWith("https://")) {
    return { ok: false, error: "Image must be a secure https URL." };
  }
  if (url.length > 15_000_000) {
    return { ok: false, error: "Image URL is invalid." };
  }
  return { ok: true, imageUrl: url };
}

export function validateContentType(contentType: string | null): boolean {
  if (!contentType) return true;
  const base = contentType.split(";")[0]?.trim().toLowerCase() ?? "";
  return (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(base);
}

export { AUTO_EDIT_CONFIG };
