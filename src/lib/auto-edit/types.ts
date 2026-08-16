/**
 * Minimal Auto Edit types required by the provided analysis files.
 * Keep these intentionally small — expand only as strictly needed.
 */

export type SceneType =
  | "portrait"
  | "landscape"
  | "night"
  | "indoor"
  | "outdoor"
  | "food"
  | "animal"
  | "product"
  | "document"
  | "other";

export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
  megapixels: number;
}

export interface PersonAnalysis {
  count: number;
  hasPrimarySubject: boolean;
  hasSecondaryPeople: boolean;
  hasBackgroundPeople: boolean;
  hasPhotobombers: boolean;
  hasPartiallyVisiblePeople: boolean;
}

export interface FaceAnalysis {
  detected: boolean;
  count: number;
  primaryFaceVisible: boolean;
  blurry: boolean;
  hasArtifacts: boolean;
  redEye: boolean;
  poorLighting: boolean;
  occluded: boolean;
}

export interface LightingAnalysis {
  isUnderexposed: boolean;
  isOverexposed: boolean;
  isUneven: boolean;
  hasHighlightClipping: boolean;
  hasShadowClipping: boolean;
  colorTemperatureOff: boolean;
}

export interface BackgroundAnalysis {
  isCluttered: boolean;
  hasDistractingElements: boolean;
  hasUnwantedObjects: boolean;
  hasDamagedRegions: boolean;
  hasInconsistentLighting: boolean;
}

export interface QualityAnalysis {
  issues: string[];
  restorationIssues: string[];
  isOldPhoto: boolean;
  overallScore: number;
}

export interface ImageAnalysisResult {
  dimensions: ImageDimensions;
  scene: SceneType | string;
  people: PersonAnalysis;
  faces: FaceAnalysis;
  background: BackgroundAnalysis;
  quality: QualityAnalysis & {
    needsRestoration: boolean;
    needsEnhancement: boolean;
  };
  lighting: LightingAnalysis;
  composition: {
    horizonStraight: boolean;
    subjectWellPlaced: boolean;
    hasEdgeDistractions: boolean;
    hasExcessiveEmptySpace: boolean;
  };
  analysisConfidence: number;
  rawVisionResponse: string;
}
