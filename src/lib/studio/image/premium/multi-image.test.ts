import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPremiumMultiGptCandidate,
  planPremiumMultiGptImage2,
} from "./multi-image";
import { GPT_IMAGE_2_EDIT_MODEL } from "@/lib/studio/image/gpt-image-2";

describe("isPremiumMultiGptCandidate", () => {
  it("only pro tier with 2+ images", () => {
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
        studioTier: "premium",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      false,
    );
    assert.equal(
      isPremiumMultiGptCandidate({
        studioTier: "standard",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      false,
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
});

describe("planPremiumMultiGptImage2", () => {
  it("forces quality low and correct credits", () => {
    const p = planPremiumMultiGptImage2({
      prompt: "merge styles",
      imageUrl: "https://a.example/1.png",
      referenceImageUrls: ["https://a.example/2.png"],
      imageQuality: "high" as "sd",
    });
    assert.equal(p.ok, true);
    if (p.ok) {
      assert.equal(p.step.model, GPT_IMAGE_2_EDIT_MODEL);
      assert.equal(p.step.body.quality, "low");
      assert.equal(p.credits, 35); // 2 imgs SD
    }
  });

  it("2k credits for 10 images", () => {
    const refs = Array.from({ length: 9 }, (_, i) => `https://a.example/r${i}.png`);
    const p = planPremiumMultiGptImage2({
      prompt: "compose",
      imageUrl: "https://a.example/base.png",
      referenceImageUrls: refs,
      imageQuality: "2k",
    });
    assert.equal(p.ok, true);
    if (p.ok) assert.equal(p.credits, 76);
  });

  it("rejects 11 images", () => {
    const refs = Array.from({ length: 10 }, (_, i) => `https://a.example/r${i}.png`);
    const p = planPremiumMultiGptImage2({
      prompt: "compose",
      imageUrl: "https://a.example/base.png",
      referenceImageUrls: refs,
      imageQuality: "sd",
    });
    assert.equal(p.ok, false);
  });
});
