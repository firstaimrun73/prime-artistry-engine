/**
 * Legacy mask/circle path: request shape → validation mode → provider model.
 * Run: npx tsx --test src/lib/studio/image/standard/legacy-mask.test.ts
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildLegacyMaskEditRequest } from "./legacy-mask";
import { validateStandardImageRequest } from "./validation";
import { buildStandardStep } from "./request-builders";
import { STANDARD_MODELS } from "./models";
import type { StandardValidationOk } from "./types";

describe("buildLegacyMaskEditRequest", () => {
  it("defaults to circleInstant true (erase)", () => {
    const req = buildLegacyMaskEditRequest({
      prompt: "remove the object",
      imageUrl: "https://cdn.example/img.png",
      maskUrl: "https://cdn.example/mask.png",
    });
    assert.equal(req.circleInstant, true);
    assert.equal(req.maskImageUrl, "https://cdn.example/mask.png");
    assert.equal(req.imageUrl, "https://cdn.example/img.png");
  });

  it("preserves explicit circleInstant false (add)", () => {
    const req = buildLegacyMaskEditRequest({
      prompt: "add a bench",
      imageUrl: "https://cdn.example/img.png",
      maskUrl: "https://cdn.example/mask.png",
      circleInstant: false,
    });
    assert.equal(req.circleInstant, false);
  });

  it("rejects non-https urls", () => {
    assert.throws(() =>
      buildLegacyMaskEditRequest({
        prompt: "x",
        imageUrl: "http://insecure/img.png",
        maskUrl: "https://cdn.example/mask.png",
      }),
    );
  });
});

describe("legacy mask → circle_to_remove handler contract", () => {
  it("validates as circle_to_remove and builds flux erase model", () => {
    const req = buildLegacyMaskEditRequest({
      prompt: "remove marked region",
      imageUrl: "https://cdn.example/orig.png",
      maskUrl: "https://cdn.example/mask.png",
      circleInstant: true,
    });
    const v = validateStandardImageRequest(req);
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.mode, "circle_to_remove");
    const step = buildStandardStep(v as StandardValidationOk);
    assert.equal(step.model, STANDARD_MODELS.circleToRemove);
    assert.equal(step.model, "fal-ai/flux-pro/v1/erase");
    assert.equal(step.body.image_url, "https://cdn.example/orig.png");
    assert.equal(step.body.mask_url, "https://cdn.example/mask.png");
  });

  it("does not treat free-form mode remove as a schema field", () => {
    const req = buildLegacyMaskEditRequest({
      prompt: "erase",
      imageUrl: "https://cdn.example/o.png",
      maskUrl: "https://cdn.example/m.png",
    });
    assert.equal("mode" in req, false);
  });
});

describe("legacy mask with circleInstant false → circle_to_add", () => {
  it("validates as circle_to_add and builds flux fill model", () => {
    const req = buildLegacyMaskEditRequest({
      prompt: "fill with a red chair",
      imageUrl: "https://cdn.example/orig.png",
      maskUrl: "https://cdn.example/mask.png",
      circleInstant: false,
    });
    const v = validateStandardImageRequest(req);
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.mode, "circle_to_add");
    const step = buildStandardStep(v as StandardValidationOk);
    assert.equal(step.model, STANDARD_MODELS.circleToAdd);
    assert.equal(step.model, "fal-ai/flux-pro/v1/fill");
  });
});

describe("mask without circleInstant via validation (non-legacy)", () => {
  it("mask only without circleInstant is circle_to_add per product rules", () => {
    const v = validateStandardImageRequest({
      prompt: "inpaint something",
      imageUrl: "https://cdn.example/o.png",
      maskImageUrl: "https://cdn.example/m.png",
    });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.mode, "circle_to_add");
  });
});
