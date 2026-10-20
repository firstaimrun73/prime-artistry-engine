# Standard Image Studio — PRODUCTION LOCK

Do not change locked models or credits without explicit product approval.

## Models

| Mode | Model |
|------|--------|
| Text → Image SD | `fal-ai/flux-2/klein/4b` |
| Text → Image HD | `fal-ai/flux-2/klein/9b` |
| Image → Image (1 image) | `fal-ai/flux-pro/kontext` |
| Multiple Image → Image (2–5 total) | `fal-ai/flux-pro/kontext/max/multi` |
| Circle to Remove | `fal-ai/flux-pro/v1/erase` |
| Circle to Add | `fal-ai/flux-pro/v1/fill` |

Standard never uses GPT Image 2 (Premium multi may).

## Credits

| Mode | Credits |
|------|---------|
| Text → Image SD | 20 |
| Text → Image HD | 25 |
| Image → Image SD | 25 |
| Image → Image HD | 30 |
| Multi 2 imgs SD/HD | 30 / 35 |
| Multi 3 imgs SD/HD | 35 / 40 |
| Multi 4 imgs SD/HD | 35 / 40 |
| Multi 5 imgs SD/HD | 40 / 45 |
| Circle to Remove | 25 flat |
| Circle to Add | 25 flat |

Aspect ratio adds 0 credits.

Provider (fal) price for Kontext Pro is fixed per image; product credits may still vary by quality. Credit table is product-locked independent of model swap.

## Rules

- Validate before fal.ai.
- Deduct credits only after a real output URL is returned (`deduct_credits` via service_role).
- Fal failure / timeout / missing URL → no charge.
- Never return the original image as the result.
- Never silently replace I2I with text-to-image when a source image exists.
- Always pass the real HTTPS `image_url` to Kontext (never blob, never "uploaded", never stale result).
- Multi: `image_urls` = [base, ref1, …] exact order; never reorder.
- Never use `enhance_prompt` on the Standard path.
- Never call GPT Image 2 on the Standard path (0, 1, or multi).
- Circle mask must match original image pixel dimensions.
- History `input_url` must store the real uploaded HTTPS URL for I2I.
- Enhance intent: explicit sharpen family only (not bare quality/hd/clear); see `isExplicitSharpenIntent` / `isStandardEnhanceIntent`.
