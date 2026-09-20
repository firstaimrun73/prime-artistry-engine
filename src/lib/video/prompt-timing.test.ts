import { describe, expect, it } from "vitest";
import {
  formatTimingClock,
  nextTimingTag,
  parsePromptTiming,
  validateTimingDetailed,
} from "./prompt-timing";

describe("parsePromptTiming", () => {
  it("parses the canonical clock range", () => {
    const r = parsePromptTiming("a hiker walks #00:00-00:02 camera rises #00:02-00:05");
    expect(r.errors).toEqual([]);
    expect(r.cues.map((c) => [c.startSec, c.endSec])).toEqual([
      [0, 2],
      [2, 5],
    ]);
    expect(r.cleanPrompt).toBe("a hiker walks camera rises");
  });

  it("parses dotted clock ranges", () => {
    const r = parsePromptTiming("#00.01-00.02 wave");
    expect(r.cues.map((c) => [c.startSec, c.endSec])).toEqual([[1, 2]]);
  });

  it("parses second ranges and does not mistake decimals for clock ranges", () => {
    const r = parsePromptTiming("#0-2s one #2-4sec two #1.5-3.5s three");
    expect(r.cues.map((c) => [c.startSec, c.endSec])).toEqual([
      [0, 2],
      [2, 4],
      [1.5, 3.5],
    ]);
  });

  it("keeps the legacy forms", () => {
    const r = parsePromptTiming("#1s a #2sec b #01:03 c");
    expect(r.cues.map((c) => [c.kind, c.startSec, c.endSec])).toEqual([
      ["timestamp", 1, 1],
      ["timestamp", 2, 2],
      ["interval", 1, 3],
    ]);
  });

  it("reports an interval whose end is not after the start", () => {
    const r = parsePromptTiming("#00:03-00:02 x");
    expect(r.cues).toEqual([]);
    expect(r.errors[0]).toContain("end must be after start");
  });
});

describe("validateTimingDetailed", () => {
  it("flags overlaps, short segments, bounds and too many tags", () => {
    const over = parsePromptTiming("#0-3s a #2-4s b").cues;
    expect(validateTimingDetailed(over, 5).map((i) => i.raw)).toEqual(["#2-4s"]);
    const short = parsePromptTiming("#0-0.5s a").cues;
    expect(validateTimingDetailed(short, 5)[0].message).toContain("at least 1 second");
    const late = parsePromptTiming("#4-8s a").cues;
    expect(validateTimingDetailed(late, 5)[0].message).toContain("ends after");
    const many = parsePromptTiming("#0-1s a #1-2s b #2-3s c #3-4s d #4-5s e #5-6s f #6-7s g").cues;
    expect(validateTimingDetailed(many, 10).some((i) => i.message.includes("at most 6"))).toBe(true);
  });

  it("accepts a clean timeline", () => {
    const ok = parsePromptTiming("#00:00-00:02 a #00:02-00:05 b").cues;
    expect(validateTimingDetailed(ok, 5)).toEqual([]);
  });
});

describe("nextTimingTag", () => {
  it("walks the timeline and stops when no time is left", () => {
    expect(formatTimingClock(65)).toBe("01:05");
    expect(nextTimingTag([], 5)).toBe("#00:00-00:02");
    let text = "#00:00-00:02";
    expect(nextTimingTag(parsePromptTiming(text).cues, 5)).toBe("#00:02-00:04");
    text += " #00:02-00:04";
    expect(nextTimingTag(parsePromptTiming(text).cues, 5)).toBe("#00:04-00:05");
    text += " #00:04-00:05";
    expect(nextTimingTag(parsePromptTiming(text).cues, 5)).toBeNull();
  });
});
