/**
 * Client-side guard for Free multi-reference generate attempts.
 * Server generateMedia is authoritative; this avoids upload/spin and shows upgrade CTA.
 */
import { canSubmitMultiReference, MULTI_IMAGE_UPGRADE_MESSAGE } from "@/utils/planLimits";

export type FreeMultiRefGuardInput = {
  plan: string | null | undefined;
  isAdmin: boolean;
  /** Gallery slots excluding the active/base image */
  extraGalleryCount: number;
  /** Legacy refImages length */
  refImagesCount: number;
};

/**
 * Returns upgrade message when Free user tries to generate with multiple references.
 * Returns null when generation is allowed to proceed.
 */
export function freeMultiRefSubmitBlockMessage(input: FreeMultiRefGuardInput): string | null {
  const multiSelected = input.extraGalleryCount > 0 || input.refImagesCount > 0;
  if (!multiSelected) return null;
  if (canSubmitMultiReference(input.plan, input.isAdmin)) return null;
  return MULTI_IMAGE_UPGRADE_MESSAGE;
}
