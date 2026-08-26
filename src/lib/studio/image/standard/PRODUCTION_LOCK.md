# Standard Image Studio — PRODUCTION LOCK

Do not change locked models or credits without explicit product approval.

## Models

| Mode | Model |
|------|--------|
| Text → Image | `fal-ai/flux/schnell` |
| Image → Image (1 image) | `fal-ai/flux-pro/kontext` |
| Multiple Image → Image (2–5 total) | `openai/gpt-image-2/edit` (quality **low** only) |
| Circle to Remove | `fal-ai/flux-pro/v1/erase` |

## Credits

| Mode | Credits |
|------|---------|
| Text → Image SD | 20 |
| Text → Image HD | 25 |
| Image → Image | 25 (no fake HD premium) |
| Multi 2 imgs SD/HD | 30 / 35 |
| Multi 3 imgs SD/HD | 35 / 40 |
| Multi 4 imgs SD/HD | 35 / 40 |
| Multi 5 imgs SD/HD | 40 / 45 |
| Circle to Remove | 25 flat |

Aspect ratio adds 0 credits. GPT Image 2 model quality is always `low`.

## Rules

- Validate before fal.ai.
- Deduct credits only after a real output URL is returned.
- Fal failure / timeout / missing URL → no charge.
- Never return the original image as the result.
- Never silently replace I2I with text-to-image.
- Never reorder multi-image references.
- Never use `enhancePrompt` on the Standard path.
- Never call GPT Image 2 for 0 or 1 total image.
- Never pass medium/high quality to GPT Image 2.
- Circle mask must match original image pixel dimensions.
- Do not modify Image Studio UI to fit this backend; backend adapts to existing UI.
