export {
  GPT_IMAGE_2_EDIT_MODEL,
  GPT_IMAGE_2_QUALITY,
  gptImage2ImageSize,
  normalizeGptImage2OutputClass,
  isStandardForbiddenOutput,
  type GptImage2Experience,
  type GptImage2OutputClass,
} from "./model";

export {
  quoteGptImage2MultiCredits,
  GPT_IMAGE_2_STANDARD_LIMITS,
  GPT_IMAGE_2_PREMIUM_LIMITS,
  type GptImage2CreditQuote,
} from "./credits";

export { buildGptImage2MultiStep, type GptImage2FalStep } from "./request";

/**
 * Collect ordered image URLs for GPT Image 2 from generateMedia fields.
 * Primary (imageUrl) first, then referenceImageUrls in order.
 * Does not invent or duplicate URLs.
 */
export function collectMultiReferenceUrls(
  imageUrl: string | null | undefined,
  referenceImageUrls: string[] | null | undefined,
): string[] {
  const out: string[] = [];
  if (typeof imageUrl === "string" && imageUrl.startsWith("https://")) {
    out.push(imageUrl);
  }
  if (Array.isArray(referenceImageUrls)) {
    for (const u of referenceImageUrls) {
      if (typeof u === "string" && u.startsWith("https://") && !out.includes(u)) {
        out.push(u);
      }
    }
  }
  return out;
}

/** True when this request should use GPT Image 2 multi path (total images >= 2). */
export function shouldUseGptImage2Multi(totalImageCount: number): boolean {
  return totalImageCount >= 2;
}
