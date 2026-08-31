/**
 * Circle 2edit public sample catalog.
 * First official sample: butterfly removed from pink zinnia (Sept 1, 2026).
 * Reusable structure for future SAMPLE / TREND / FEATURED / NEW entries.
 */
import circleBefore from "@/assets/circle-sample-butterfly-before.jpg";
import circleAfter from "@/assets/circle-sample-butterfly-after.jpg";

export type CircleSampleLabel =
  | "SAMPLE"
  | "TREND"
  | "TRY ON"
  | "NEW"
  | "POPULAR"
  | "CREATIVE"
  | "FEATURED";

export type CircleSample = {
  id: string;
  label: CircleSampleLabel;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  aspectRatio: string;
  quality: string;
  /** Display date only — no invented generation time */
  dateLabel: string;
  tool: string;
  operation: string;
  attribution: string;
  poweredBy: string;
  tags: string[];
  /** Route for details */
  detailsHref: "/studio/image/circle-info";
  /** Editor entry */
  tryHref: "/studio/image/circle-remove";
};

/** Official first Circle 2edit Remove sample (user-provided pair). */
export const CIRCLE_SAMPLE_BUTTERFLY: CircleSample = {
  id: "circle-remove-butterfly-zinnia-2026-09-01",
  label: "SAMPLE",
  title: "Remove a butterfly from a flower",
  description:
    "Remove an unwanted butterfly from a detailed flower photograph while preserving the flower, background depth, lighting, and natural composition.",
  beforeImage: circleBefore,
  afterImage: circleAfter,
  aspectRatio: "16:9",
  quality: "High Quality",
  dateLabel: "September 1, 2026",
  tool: "Circle 2edit",
  operation: "Remove Object",
  attribution: "Edited by Motio2edit",
  poweredBy: "Powered by Motion2AI",
  tags: ["remove", "nature", "flower", "insect"],
  detailsHref: "/studio/image/circle-info",
  tryHref: "/studio/image/circle-remove",
};

/** Ordered public samples — expand here without rewriting homepage JSX. */
export const CIRCLE_SAMPLES: CircleSample[] = [CIRCLE_SAMPLE_BUTTERFLY];

export function getPrimaryCircleSample(): CircleSample {
  return CIRCLE_SAMPLES[0] ?? CIRCLE_SAMPLE_BUTTERFLY;
}

export function getCircleSampleById(id: string): CircleSample | undefined {
  return CIRCLE_SAMPLES.find((s) => s.id === id);
}
