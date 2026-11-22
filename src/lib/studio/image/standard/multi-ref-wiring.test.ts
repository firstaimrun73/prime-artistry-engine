import { describe, expect, it } from "vitest";
import { buildMultiImageStep } from "./request-builders";
import type { StandardValidationOk } from "./types";

describe("Standard multi-image base-first ordering", () => {
  const base = "https://assets.example.com/base.jpg";
  const ref1 = "https://assets.example.com/ref1.jpg";
  const ref2 = "https://assets.example.com/ref2.jpg";

  function ok(partial: Partial<StandardValidationOk> & { prompt: string }): StandardValidationOk {
    return {
      mode: "multi_image_to_image",
      prompt: partial.prompt,
      imageUrl: partial.imageUrl ?? base,
      referenceImageUrls: partial.referenceImageUrls ?? [ref1, ref2],
      maskImageUrl: null,
      imageQuality: "hd",
      aspectRatio: "1:1",
      circleInstant: false,
      ...partial,
    } as StandardValidationOk;
  }

  it("places base image first in image_urls", () => {
    const step = buildMultiImageStep(
      ok({ prompt: "Change outfit using the reference clothing" }),
    );
    const urls = step.body.image_urls as string[];
    expect(urls[0]).toBe(base);
    expect(urls[1]).toBe(ref1);
    expect(urls[2]).toBe(ref2);
    expect(urls).toHaveLength(3);
  });

  it("embeds identity preservation for image 1", () => {
    const step = buildMultiImageStep(ok({ prompt: "Apply the jacket from reference" }));
    const prompt = String(step.body.prompt);
    expect(prompt.toLowerCase()).toMatch(/image 1|base\/source person|preserve.*identity/);
    expect(step.body.enhance_prompt).toBe(false);
  });

  it("rejects non-https base", () => {
    expect(() =>
      buildMultiImageStep(ok({ prompt: "x", imageUrl: "http://insecure.example/a.jpg" })),
    ).toThrow(/HTTPS/i);
  });
});
