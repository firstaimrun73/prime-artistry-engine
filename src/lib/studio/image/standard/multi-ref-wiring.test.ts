import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateStandardImageRequest } from "./validation";
import { quoteStandardCredits } from "./credits";
import { collectMultiReferenceUrls } from "../gpt-image-2";

const H = (n: number) => `https://cdn.example/img-${n}.png`;

describe("Standard multi-reference request assembly", () => {
  it("accepts 2–5 total images with primary + ordered refs", () => {
    for (const n of [1, 2, 3, 4]) {
      const refs = Array.from({ length: n }, (_, i) => H(i + 2));
      const v = validateStandardImageRequest({
        prompt: "combine these",
        imageUrl: H(1),
        referenceImageUrls: refs,
        imageQuality: "sd",
      });
      assert.equal(v.ok, true);
      if (v.ok) {
        assert.equal(v.mode, "multi_image_to_image");
        assert.equal(v.imageUrl, H(1));
        assert.deepEqual(v.referenceImageUrls, refs);
        const total = 1 + v.referenceImageUrls.length;
        assert.ok(total >= 2 && total <= 5);
        const q = quoteStandardCredits({
          mode: "multi_image_to_image",
          referenceCount: total,
          imageQuality: "sd",
        });
        assert.ok(q.credits > 0);
      }
    }
  });

  it("preserves reference order and collect helper", () => {
    const refs = [H(2), H(3), H(4)];
    const v = validateStandardImageRequest({
      prompt: "order check",
      imageUrl: H(1),
      referenceImageUrls: refs,
    });
    assert.equal(v.ok, true);
    if (v.ok) assert.deepEqual(v.referenceImageUrls, refs);
    assert.deepEqual(collectMultiReferenceUrls(H(1), refs), [H(1), ...refs]);
  });

  it("does not treat single image as multi", () => {
    const v = validateStandardImageRequest({
      prompt: "single",
      imageUrl: H(1),
      referenceImageUrls: [],
    });
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.mode, "image_to_image");
  });
});
