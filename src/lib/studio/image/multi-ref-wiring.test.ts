/**
 * Multi-reference wiring: collectMultiReferenceUrls + Standard routing counts.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { collectMultiReferenceUrls } from "./gpt-image-2";
import { routeStandardImage } from "./standard";

const H = (n: number) => `https://cdn.example.com/img-${n}.png`;

describe("collectMultiReferenceUrls", () => {
  it("orders primary first then refs without duplicates", () => {
    const out = collectMultiReferenceUrls(H(1), [H(2), H(3), H(1)]);
    assert.deepEqual(out, [H(1), H(2), H(3)]);
  });
  it("handles refs-only (no primary)", () => {
    assert.deepEqual(collectMultiReferenceUrls(null, [H(2), H(3)]), [H(2), H(3)]);
  });
  it("handles primary-only", () => {
    assert.deepEqual(collectMultiReferenceUrls(H(1), []), [H(1)]);
  });
  it("filters non-https", () => {
    assert.deepEqual(
      collectMultiReferenceUrls("blob:x", ["data:y", H(2)]),
      [H(2)],
    );
  });
});

describe("Standard multi-ref routing", () => {
  it("accepts 2, 3 and 5 total images", () => {
    for (const n of [2, 3, 5]) {
      const refs = Array.from({ length: n - 1 }, (_, i) => H(i + 2));
      const r = routeStandardImage({
        prompt: "combine",
        imageUrl: H(1),
        referenceImageUrls: refs,
        imageQuality: "sd",
      });
      assert.equal(r.ok, true, `n=${n} ${JSON.stringify(r)}`);
      if (r.ok) {
        assert.equal(r.mode, "multi_image_to_image");
        assert.equal(1 + (r.referenceImageUrls?.length ?? 0), n);
      }
    }
  });
  it("rejects more than 5 for standard multi", () => {
    const refs = [H(2), H(3), H(4), H(5), H(6)];
    const r = routeStandardImage({
      prompt: "too many",
      imageUrl: H(1),
      referenceImageUrls: refs,
    });
    assert.equal(r.ok, false);
  });
});
