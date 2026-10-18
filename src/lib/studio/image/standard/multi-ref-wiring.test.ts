/**
 * Regression: Standard multi-ref wiring + Premium/Ultra candidate routing.
 * Ensures reference lists are not silently dropped before the provider call.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  routeStandardImage,
  quoteAfterValidation,
} from "@/lib/studio/image/standard";
import {
  isPremiumMultiGptCandidate,
  planPremiumMultiGptImage2,
} from "@/lib/studio/image/premium";
import {
  isUltraMultiSeedreamCandidate,
  validateUltraImageRequest,
} from "@/lib/studio/image/ultra";
import { collectMultiReferenceUrls } from "@/lib/studio/image/gpt-image-2";

describe("Standard multi-ref wiring", () => {
  it("routes 2 total images (primary + 1 ref) to multi_image_to_image", () => {
    const v = routeStandardImage({
      prompt: "blend styles",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: ["https://cdn.example/r1.png"],
      imageQuality: "sd",
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.mode, "multi_image_to_image");
      assert.equal(v.imageUrl, "https://cdn.example/base.png");
      assert.deepEqual(v.referenceImageUrls, ["https://cdn.example/r1.png"]);
      const q = quoteAfterValidation(v);
      assert.ok(q.credits > 0);
    }
  });

  it("routes 3 and 5 total images and preserves order", () => {
    const refs3 = [
      "https://cdn.example/r1.png",
      "https://cdn.example/r2.png",
    ];
    const v3 = routeStandardImage({
      prompt: "compose",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: refs3,
    });
    assert.equal(v3.ok, true);
    if (v3.ok) {
      assert.equal(v3.mode, "multi_image_to_image");
      assert.deepEqual(v3.referenceImageUrls, refs3);
    }

    const refs5 = [
      "https://cdn.example/r1.png",
      "https://cdn.example/r2.png",
      "https://cdn.example/r3.png",
      "https://cdn.example/r4.png",
    ];
    const v5 = routeStandardImage({
      prompt: "compose five",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: refs5,
    });
    assert.equal(v5.ok, true);
    if (v5.ok) {
      assert.equal(v5.mode, "multi_image_to_image");
      assert.equal(1 + v5.referenceImageUrls.length, 5);
      assert.deepEqual(v5.referenceImageUrls, refs5);
    }
  });

  it("rejects missing source for multi and zero-ref multi quote path", () => {
    const noPrimary = routeStandardImage({
      prompt: "refs only",
      referenceImageUrls: ["https://cdn.example/r1.png"],
    });
    assert.equal(noPrimary.ok, false);

    const single = routeStandardImage({
      prompt: "edit",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: [],
    });
    assert.equal(single.ok, true);
    if (single.ok) assert.equal(single.mode, "image_to_image");
  });

  it("mask path does not enter multi-reference route", () => {
    const v = routeStandardImage({
      prompt: "erase area",
      imageUrl: "https://cdn.example/base.png",
      maskImageUrl: "https://cdn.example/mask.png",
      referenceImageUrls: ["https://cdn.example/r1.png"],
      circleInstant: true,
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.mode, "circle_to_remove");
      assert.deepEqual(v.referenceImageUrls, []);
    }
  });
});

describe("Premium multi GPT Image 2 candidate + plan", () => {
  it("collects primary + all refs in order", () => {
    const urls = collectMultiReferenceUrls("https://a.example/1.png", [
      "https://a.example/2.png",
      "https://a.example/3.png",
    ]);
    assert.deepEqual(urls, [
      "https://a.example/1.png",
      "https://a.example/2.png",
      "https://a.example/3.png",
    ]);
  });

  it("isPremiumMultiGptCandidate only for pro + 2-10 images", () => {
    assert.equal(
      isPremiumMultiGptCandidate({
        studioTier: "pro",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      true,
    );
    assert.equal(
      isPremiumMultiGptCandidate({
        studioTier: "pro",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: [],
      }),
      false,
    );
  });

  it("planPremiumMultiGptImage2 includes every selected URL in step body", () => {
    const refs = [
      "https://a.example/2.png",
      "https://a.example/3.png",
      "https://a.example/4.png",
    ];
    const p = planPremiumMultiGptImage2({
      prompt: "merge",
      imageUrl: "https://a.example/1.png",
      referenceImageUrls: refs,
      imageQuality: "sd",
    });
    assert.equal(p.ok, true);
    if (p.ok) {
      assert.equal(p.imageUrls.length, 4);
      assert.deepEqual(p.step.body.image_urls, p.imageUrls);
      assert.equal(p.step.body.image_urls[0], "https://a.example/1.png");
    }
  });
});

describe("Ultra Seedream multi candidate", () => {
  it("isUltraMultiSeedreamCandidate for premium tier 2-10", () => {
    assert.equal(
      isUltraMultiSeedreamCandidate({
        studioTier: "premium",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      true,
    );
  });

  it("validateUltraImageRequest preserves all image URLs", () => {
    const refs = ["https://a.example/2.png", "https://a.example/3.png"];
    const v = validateUltraImageRequest({
      prompt: "ultra merge",
      imageUrl: "https://a.example/1.png",
      referenceImageUrls: refs,
      imageQuality: "sd",
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.mode, "multi_image");
      assert.equal(v.referenceCount, 3);
      assert.deepEqual(v.imageUrls, [
        "https://a.example/1.png",
        "https://a.example/2.png",
        "https://a.example/3.png",
      ]);
    }
  });
});
