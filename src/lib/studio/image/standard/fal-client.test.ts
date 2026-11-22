import { describe, expect, it } from "vitest";
import { extractFalOutputUrl } from "./fal-client";

describe("extractFalOutputUrl", () => {
  it("reads image.url", () => {
    expect(extractFalOutputUrl({ image: { url: "https://cdn.example/a.png" } })).toBe(
      "https://cdn.example/a.png",
    );
  });

  it("reads images[0].url", () => {
    expect(
      extractFalOutputUrl({ images: [{ url: "https://cdn.example/b.png" }] }),
    ).toBe("https://cdn.example/b.png");
  });

  it("reads video.url", () => {
    expect(extractFalOutputUrl({ video: { url: "https://cdn.example/c.mp4" } })).toBe(
      "https://cdn.example/c.mp4",
    );
  });

  it("reads string output and url fields", () => {
    expect(extractFalOutputUrl({ output: "https://cdn.example/d.png" })).toBe(
      "https://cdn.example/d.png",
    );
    expect(extractFalOutputUrl({ url: "https://cdn.example/e.png" })).toBe(
      "https://cdn.example/e.png",
    );
  });

  it("reads nested data.image / data.images", () => {
    expect(
      extractFalOutputUrl({ data: { image: { url: "https://cdn.example/f.png" } } }),
    ).toBe("https://cdn.example/f.png");
    expect(
      extractFalOutputUrl({ data: { images: [{ url: "https://cdn.example/g.png" }] } }),
    ).toBe("https://cdn.example/g.png");
  });

  it("rejects non-http and empty payloads", () => {
    expect(extractFalOutputUrl(null)).toBeNull();
    expect(extractFalOutputUrl({})).toBeNull();
    expect(extractFalOutputUrl({ image: { url: "/relative.png" } })).toBeNull();
    expect(extractFalOutputUrl({ url: "ftp://bad" })).toBeNull();
  });
});
