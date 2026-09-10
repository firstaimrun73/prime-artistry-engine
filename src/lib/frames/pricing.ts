/**
 * Frames pricing — isolated from Video Studio.
 * Deterministic composition is cheap; server is the authority.
 */
import type { FramesQuote } from "./types";

export const FRAMES_BASE_CREDITS = 5;
export const FRAMES_HD_BONUS = 3;
export const FRAMES_HD_EDGE = 2048;

export function quoteFramesExport(opts: { longEdge: number }): FramesQuote {
  const long = Math.max(1, Math.floor(opts.longEdge));
  let credits = FRAMES_BASE_CREDITS;
  if (long >= FRAMES_HD_EDGE) credits += FRAMES_HD_BONUS;
  return {
    credits,
    free: false,
    label: `${credits} credits`,
  };
}
