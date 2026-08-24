/**
 * Unit checks for Auto Edit credits + entitlements + quality isolation (no network).
 * Run: npx tsx --test src/lib/auto-edit/auto-edit.credits.test.ts
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AUTO_EDIT_CREDITS_BY_QUALITY,
  AUTO_EDIT_FAL_MODEL,
  AUTO_EDIT_TARGET_MP,
  AUTO_EDIT_VISION_LLM,
  AUTO_EDIT_VISION_MODEL,
  autoEditCreditCost,
  autoEditTargetMegapixels,
} from "./constants";
import {
  AUTO_EDIT_QUALITIES_BY_PLAN,
  FREE_AUTO_EDIT_LIMIT,
  planAllowsAutoEditQuality,
  assertFreeAutoEditAllowance,
  assertAutoEditQualityEntitlement,
} from "./entitlements";
import {
  AUTO_EDIT_QUALITY_OPTIONS,
  autoEditQualitiesForPlan,
  defaultAutoEditQualityForPlan,
  getAutoEditQualityOption,
} from "./auto-edit.quality";

describe("Auto Edit models", () => {
  it("uses Gemini Flash Lite + Kontext LoRA (not GPT Image 2)", () => {
    assert.equal(AUTO_EDIT_VISION_MODEL, "fal-ai/any-llm/vision");
    assert.equal(AUTO_EDIT_VISION_LLM, "google/gemini-2.5-flash-lite");
    assert.equal(AUTO_EDIT_FAL_MODEL, "fal-ai/flux-kontext-lora");
    assert.notEqual(AUTO_EDIT_FAL_MODEL, "openai/gpt-image-2/edit");
  });
});

describe("Auto Edit credits", () => {
  it("matches product matrix", () => {
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY.sd, 45);
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY.hd, 45);
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY["2k"], 50);
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY["4k"], 60);
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY["8k"], 60);
    assert.equal(AUTO_EDIT_CREDITS_BY_QUALITY["8k_max"], 65);
    assert.equal(autoEditCreditCost("hd"), 45);
    assert.equal(autoEditCreditCost("8k_max"), 65);
  });

  it("matches megapixel targets", () => {
    assert.equal(AUTO_EDIT_TARGET_MP.sd, 1);
    assert.equal(AUTO_EDIT_TARGET_MP.hd, 1);
    assert.equal(AUTO_EDIT_TARGET_MP["2k"], 2);
    assert.equal(AUTO_EDIT_TARGET_MP["4k"], 3);
    assert.equal(AUTO_EDIT_TARGET_MP["8k"], 4);
    assert.equal(AUTO_EDIT_TARGET_MP["8k_max"], 6);
    assert.equal(autoEditTargetMegapixels("4k"), 3);
  });
});

describe("Auto Edit plan entitlements", () => {
  it("enforces plan quality matrix", () => {
    assert.deepEqual([...AUTO_EDIT_QUALITIES_BY_PLAN.free], ["sd", "hd"]);
    assert.deepEqual([...AUTO_EDIT_QUALITIES_BY_PLAN.plus], ["sd", "hd", "2k"]);
    assert.deepEqual([...AUTO_EDIT_QUALITIES_BY_PLAN.pro], ["sd", "hd", "2k", "4k"]);
    assert.deepEqual([...AUTO_EDIT_QUALITIES_BY_PLAN.studio], ["sd", "hd", "2k", "4k", "8k"]);
    assert.ok(AUTO_EDIT_QUALITIES_BY_PLAN.business.includes("8k_max"));

    assert.equal(planAllowsAutoEditQuality("free", "hd"), true);
    assert.equal(planAllowsAutoEditQuality("free", "2k"), false);
    assert.equal(planAllowsAutoEditQuality("business", "8k_max"), true);

    assert.throws(() => assertAutoEditQualityEntitlement("free", "4k"));
    assert.doesNotThrow(() => assertAutoEditQualityEntitlement("pro", "4k"));
  });

  it("limits free users to one Auto Edit", () => {
    assert.equal(FREE_AUTO_EDIT_LIMIT, 1);
    assert.doesNotThrow(() =>
      assertFreeAutoEditAllowance({ plan: "free", isAdmin: false, autoEditUsedCount: 0 }),
    );
    assert.throws(() =>
      assertFreeAutoEditAllowance({ plan: "free", isAdmin: false, autoEditUsedCount: 1 }),
    );
    assert.doesNotThrow(() =>
      assertFreeAutoEditAllowance({ plan: "free", isAdmin: true, autoEditUsedCount: 99 }),
    );
    assert.doesNotThrow(() =>
      assertFreeAutoEditAllowance({ plan: "pro", isAdmin: false, autoEditUsedCount: 99 }),
    );
  });
});

describe("Auto Edit isolated quality UI catalog", () => {
  it("includes 8k_max with API id 8k_max and label 8K Max", () => {
    const max = getAutoEditQualityOption("8k_max");
    assert.ok(max);
    assert.equal(max!.id, "8k_max");
    assert.equal(max!.label, "8K Max");
    assert.equal(max!.credits, 65);
    assert.equal(max!.targetMegapixels, 6);
    assert.equal(AUTO_EDIT_QUALITY_OPTIONS.length, 6);
  });

  it("filters qualities by plan for frontend", () => {
    assert.deepEqual(
      autoEditQualitiesForPlan("free").map((o) => o.id),
      ["sd", "hd"],
    );
    assert.deepEqual(
      autoEditQualitiesForPlan("plus").map((o) => o.id),
      ["sd", "hd", "2k"],
    );
    assert.deepEqual(
      autoEditQualitiesForPlan("pro").map((o) => o.id),
      ["sd", "hd", "2k", "4k"],
    );
    assert.deepEqual(
      autoEditQualitiesForPlan("studio").map((o) => o.id),
      ["sd", "hd", "2k", "4k", "8k"],
    );
    assert.deepEqual(
      autoEditQualitiesForPlan("business").map((o) => o.id),
      ["sd", "hd", "2k", "4k", "8k", "8k_max"],
    );
    assert.equal(defaultAutoEditQualityForPlan("free"), "hd");
    assert.equal(defaultAutoEditQualityForPlan("business"), "hd");
  });
});
