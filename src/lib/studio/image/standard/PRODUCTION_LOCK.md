# Standard Image Studio — PRODUCTION LOCK

Do not change locked models or credits without explicit product approval.

## Models

| Mode | Model |
|------|--------|
| Text → Image | `fal-ai/flux/schnell` |
| Image → Image | `fal-ai/flux-pro/kontext` |
| Multiple Image → Image | `fal-ai/flux-pro/kontext/multi` |
| Circle to Remove | `fal-ai/flux-pro/v1/erase` |

## Credits

| Mode | Credits |
|------|---------|
| Text → Image SD | 25 |
| Text → Image HD | 30 |
| Image → Image | 25 (no fake HD premium) |
| Multi 1–2 refs | 30 |
| Multi 3–4 refs | 35 |
| Multi 5 refs | 40 |
| Circle to Remove | 25 flat |

## Rules

- Validate before fal.ai.
- Deduct credits only after a real output URL is returned.
- Fal failure / timeout / missing URL → no charge.
- Never return the original image as the result.
- Never silently replace I2I with text-to-image.
- Never reorder multi-image references.
- Never use `enhancePrompt` on the Standard path.
- Circle mask must match original image pixel dimensions.
- Do not modify Image Studio UI to fit this backend; backend adapts to existing UI.
