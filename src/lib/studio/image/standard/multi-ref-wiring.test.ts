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
      prompt: "five images",
      imageUrl: "https://cdn.example/base.png",
      referenceImageUrls: refs5,
    });
    assert.equal(v5.ok, true);
    if (v5.ok) {
      assert.equal(v5.mode, "multi_image_to_image");
      assert.deepEqual(v5.referenceImageUrls, refs5);
    }
  });
});

describe("Premium multi GPT candidate + plan", () => {
  it("isPremiumMultiGptCandidate true for pro + 2–10 refs", () => {
    assert.equal(
      isPremiumMultiGptCandidate({
        studioTier: "pro",
        imageUrl: "https://cdn.example/base.png",
        referenceImageUrls: ["https://cdn.example/r1.png"],
      }),
      true,
    );
    assert.equal(
      isPremiumMultiGptCandidate({
        studioTier: "standard",
        imageUrl: "https://cdn.example/base.png",
        referenceImageUrls: ["https://cdn.example/r1.png"],
      }),
      false,
    );
  });

  it("planPremiumMultiGptImage2 builds ordered imageUrls and step", () => {
    const plan = planPremiumMultiGptImage2({
      prompt: "outfit transfer",
      imageUrl: "https://cdn.example/person.png",
      referenceImageUrls: [
        "https://cdn.example/outfit.png",
        "https://cdn.example/style.png",
      ],
      imageQuality: "hd",
      aspectRatio: "1:1",
    });
    assert.equal(plan.ok, true);
    if (plan.ok) {
      assert.ok(plan.imageUrls.length >= 2);
      assert.equal(plan.imageUrls[0], "https://cdn.example/person.png");
      assert.ok(plan.imageUrls.includes("https://cdn.example/outfit.png"));
      assert.ok(plan.credits > 0);
      assert.ok(plan.step?.model);
      assert.equal(plan.step.body.quality, "low");
    }
  });
});

describe("Ultra multi Seedream candidate + validation", () => {
  it("isUltraMultiSeedreamCandidate for premium + 2–10", () => {
    assert.equal(
      isUltraMultiSeedreamCandidate({
        studioTier: "premium",
        imageUrl: "https://cdn.example/a.png",
        referenceImageUrls: ["https://cdn.example/b.png"],
      }),
      true,
    );
  });

  it("validateUltraImageRequest preserves ordered refs", () => {
    const v = validateUltraImageRequest({
      prompt: "cinematic blend",
      imageUrl: "https://cdn.example/1.png",
      referenceImageUrls: [
        "https://cdn.example/2.png",
        "https://cdn.example/3.png",
      ],
      imageQuality: "hd",
    });
    assert.equal(v.ok, true);
    if (v.ok) {
      assert.equal(v.mode, "multi_image");
      assert.equal(v.referenceCount, 3);
      assert.deepEqual(v.imageUrls, [
        "https://cdn.example/1.png",
        "https://cdn.example/2.png",
        "https://cdn.example/3.png",
      ]);
    }
  });
});
