/**
 * Auto Edit — Lighting & Background Analysis
 */
import type { LightingAnalysis, BackgroundAnalysis } from "../types";

export function analyzeLighting(visionText: string): LightingAnalysis {
  const t = visionText;
  return {
    isUnderexposed: /underexpos|too\s+dark|very\s+dark|dark\s+image|crushed\s+shadow/i.test(
      t,
    ),
    isOverexposed: /overexpos|blown\s+highlight|too\s+bright|washed\s+out/i.test(t),
    isUneven: /uneven\s+light|inconsistent\s+light|patchy\s+light|mixed\s+light/i.test(
      t,
    ),
    hasHighlightClipping: /highlight\s+clip|blown\s+highlight|clipped\s+highlight/i.test(
      t,
    ),
    hasShadowClipping: /shadow\s+clip|crushed\s+shadow|clipped\s+shadow/i.test(t),
    colorTemperatureOff: /color\s+temperature|colour\s+temperature|wrong\s+white\s+balance|color\s+cast|colour\s+cast/i.test(
      t,
    ),
  };
}

export function analyzeBackground(visionText: string): BackgroundAnalysis {
  const t = visionText;
  return {
    isCluttered: /cluttered?\s+background|busy\s+background|messy\s+background/i.test(t),
    hasDistractingElements: /distracting\s+(element|object|person|background)|background\s+distract/i.test(
      t,
    ),
    hasUnwantedObjects: /unwanted\s+(object|element|person)|undesired\s+object|intrusive\s+object/i.test(
      t,
    ),
    hasDamagedRegions: /damaged?\s+(region|area|background)|background\s+damage|torn\s+background/i.test(t),
    hasInconsistentLighting: /inconsistent\s+light|uneven\s+background\s+light|background\s+too\s+(bright|dark)/i.test(
      t,
    ),
  };
}
