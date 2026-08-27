/**
 * Coordinate conversion for the Mask Engine.
 *
 * Pipeline (matches Crop Engine discipline):
 *   clientX/clientY
 *   → workspace / view canvas bounding rect
 *   → normalized [0,1] in displayed image
 *   → natural image pixel coordinate
 *   → mask canvas coordinate (1:1 with natural when mask is at natural res)
 *
 * Never assume screen px === image px.
 */

import type { Point, Size } from "./types";

/**
 * Map pointer client coords → natural image pixels.
 * Uses the displayed view canvas getBoundingClientRect so CSS scale,
 * object-fit, and transform offsets are all accounted for.
 */
export function clientToNatural(
  clientX: number,
  clientY: number,
  viewRect: DOMRect,
  natural: Size,
): Point {
  if (viewRect.width < 1 || viewRect.height < 1) {
    return { x: 0, y: 0 };
  }
  const nx = ((clientX - viewRect.left) / viewRect.width) * natural.width;
  const ny = ((clientY - viewRect.top) / viewRect.height) * natural.height;
  return {
    x: Math.max(0, Math.min(natural.width, nx)),
    y: Math.max(0, Math.min(natural.height, ny)),
  };
}

/**
 * Convert a screen-pixel brush radius to natural-image pixels
 * given the current display scale (natural → screen).
 */
export function screenRadiusToNatural(
  screenRadiusPx: number,
  displayScale: number,
): number {
  if (displayScale <= 0) return screenRadiusPx;
  return screenRadiusPx / displayScale;
}

/**
 * Contain-fit scale: full image visible, never cropped, never stretched.
 */
export function computeContainScale(
  natural: Size,
  viewportW: number,
  viewportH: number,
  pad = 12,
): number {
  const availableW = Math.max(80, viewportW - pad * 2);
  const availableH = Math.max(120, viewportH - pad * 2);
  if (natural.width < 1 || natural.height < 1) return 1;
  const scale = Math.min(availableW / natural.width, availableH / natural.height);
  return Math.min(Math.max(scale, 0.12), 3);
}

/**
 * Stroke sampling step in natural pixels so continuous strokes have no gaps.
 */
export function strokeStepNatural(brushRadiusNatural: number): number {
  return Math.max(0.5, brushRadiusNatural / 3);
}
