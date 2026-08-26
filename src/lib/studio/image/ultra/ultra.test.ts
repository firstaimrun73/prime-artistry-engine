import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  quoteUltraCredits,
  buildUltraMultiCreditTable,
  validateUltraImageRequest,
  isUltraMultiSeedreamCandidate,
  buildUltraGenerationStep,
  assertSeedreamBodySafe,
  ULTRA_FLUX_2_PRO_T2I,
  ULTRA_FLUX_2_PRO_EDIT,
  ULTRA_SEEDREAM_EDIT,
  estimateUltraProviderCost,
  ultraCustomerValueUsd,
} from "./index";

describe("Ultra multi reference counts", () => {
  for (let n = 2; n <= 10; n++) {
    it(`${n} refs valid`, () => {
      const refs = Array.from({ length: n - 1 }, (_, i) => `https://a.example/r${i}.png`);
      const v = validateUltraImageRequest({
        prompt: "compose",
        imageUrl: "https://a.example/base.png",
        referenceImageUrls: refs,
        imageQuality: "sd",
      });
      assert.equal(v.ok, true);
      if (v.ok) {
        assert.equal(v.mode, "multi_image");
        assert.equal(v.referenceCount, n);
      }
    });
  }

  it("11 refs reject", () => {
    const refs = Array.from({ length: 10 }, (_, i) => `https://a.example/r${i}.png`);
    const v = validateUltraImageRequest({
      prompt: "compose",
      imageUrl: "https://a.example/base.png",
      referenceImageUrls: refs,
    });
    assert.equal(v.ok, false);
  });

  it("15 refs reject", () => {
    const refs = Array.from({ length: 14 }, (_, i) => `https://a.example/r${i}.png`);
    const v = validateUltraImageRequest({
      prompt: "compose",
      imageUrl: "https://a.example/base.png",
      referenceImageUrls: refs,
    });
    assert.equal(v.ok, false);
  });
});

describe("Ultra quality × credits (2,5,10)", () => {
  const qualities = ["sd", "hd", "2k", "4k", "8k", "8k_max"] as const;
  for (const n of [2, 5, 10]) {
    for (const q of qualities) {
      it(`${n} refs + ${q}`, () => {
        const qte = quoteUltraCredits({
          mode: "multi_image",
          quality: q,
          referenceCount: n,
        });
        assert.ok(qte.credits >= 40 && qte.credits <= 100);
      });
    }
  }
});

describe("IMAX rules", () => {
  for (const q of ["sd", "hd", "2k", "4k", "8k"] as const) {
    it(`${q} + IMAX reject`, () => {
      const v = validateUltraImageRequest({
        prompt: "cinematic",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
        imageQuality: q,
        imax: true,
      });
      assert.equal(v.ok, false);
    });
  }

  it("8k_max + IMAX allow", () => {
    const v = validateUltraImageRequest({
      prompt: "cinematic",
      imageUrl: "https://a.example/1.png",
      referenceImageUrls: ["https://a.example/2.png"],
      imageQuality: "8k_max",
      imax: true,
    });
    assert.equal(v.ok, true);
    if (v.ok) assert.equal(v.aspectRatio, "imax");
  });
});

describe("Model routing", () => {
  it("0 images → Flux 2 Pro T2I", () => {
    const v = validateUltraImageRequest({ prompt: "sky", imageQuality: "sd" });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    const step = buildUltraGenerationStep(v);
    assert.equal(step.model, ULTRA_FLUX_2_PRO_T2I);
  });

  it("1 image → Flux 2 Pro edit (never Seedream)", () => {
    const v = validateUltraImageRequest({
      prompt: "edit",
      imageUrl: "https://a.example/1.png",
      imageQuality: "hd",
    });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    assert.equal(v.mode, "image_to_image");
    const step = buildUltraGenerationStep(v);
    assert.equal(step.model, ULTRA_FLUX_2_PRO_EDIT);
    assert.notEqual(step.model, ULTRA_SEEDREAM_EDIT);
  });

  it("2 images → Seedream", () => {
    const v = validateUltraImageRequest({
      prompt: "merge",
      imageUrl: "https://a.example/1.png",
      referenceImageUrls: ["https://a.example/2.png"],
    });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    const step = buildUltraGenerationStep(v);
    assert.equal(step.model, ULTRA_SEEDREAM_EDIT);
    assertSeedreamBodySafe(step.body);
  });

  it("10 images → Seedream", () => {
    const refs = Array.from({ length: 9 }, (_, i) => `https://a.example/r${i}.png`);
    const v = validateUltraImageRequest({
      prompt: "merge",
      imageUrl: "https://a.example/base.png",
      referenceImageUrls: refs,
      imageQuality: "8k_max",
    });
    assert.equal(v.ok, true);
    if (!v.ok) return;
    const step = buildUltraGenerationStep(v);
    assert.equal(step.model, ULTRA_SEEDREAM_EDIT);
    const size = String(step.body.image_size);
    assert.ok(!/4k|8k|4096|8192/i.test(size));
  });
});

describe("isUltraMultiSeedreamCandidate", () => {
  it("premium + 2 images true", () => {
    assert.equal(
      isUltraMultiSeedreamCandidate({
        studioTier: "premium",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      true,
    );
  });
  it("pro tier false", () => {
    assert.equal(
      isUltraMultiSeedreamCandidate({
        studioTier: "pro",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: ["https://a.example/2.png"],
      }),
      false,
    );
  });
  it("1 image false", () => {
    assert.equal(
      isUltraMultiSeedreamCandidate({
        studioTier: "premium",
        imageUrl: "https://a.example/1.png",
        referenceImageUrls: [],
      }),
      false,
    );
  });
});

describe("credit table shape", () => {
  it("matches deterministic formula roughly", () => {
    const table = buildUltraMultiCreditTable();
    assert.equal(table[2].sd, 40);
    assert.equal(table[10].sd, 70);
    assert.equal(table[10]["8k_max"], 100);
    assert.ok(table[2]["8k_max"] < 100);
  });
});

describe("provider cost positive", () => {
  it("10 refs 8k_max has provider cost", () => {
    const p = estimateUltraProviderCost({
      mode: "multi_image",
      quality: "8k_max",
      referenceCount: 10,
    });
    assert.ok(p.totalUsd > 0.2);
    const customer = ultraCustomerValueUsd(100);
    assert.ok(customer > p.totalUsd * 0.5);
  });
});
