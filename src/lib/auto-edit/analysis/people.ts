/**
 * Auto Edit — People & Face Analysis
 * Extracts person/face signals from vision response text.
 */
import type { PersonAnalysis, FaceAnalysis } from "../types";

export function analyzePeople(visionText: string): PersonAnalysis {
  const t = visionText.toLowerCase();

  const multipleMatch = t.match(
    /(\d+)\s+people|(\d+)\s+persons?|(\d+)\s+individuals?/
  );

  const count = multipleMatch
    ? parseInt(
        multipleMatch[1] ?? multipleMatch[2] ?? multipleMatch[3] ?? "1",
        10,
      )
    : /\bno\s+people\b|\bno\s+person\b|\bno\s+human/i.test(t)
    ? 0
    : /\ba\s+person\b|single\s+person|one\s+person|\bportrait\b|\bselfie\b/i.test(
        t,
      )
    ? 1
    : /\bpeople\b|\bpersons?\b|\bhumans?\b/i.test(t)
    ? 2
    : 0;

  const hasPhotobombers = /photobomb|unwanted\s+person|unexpected\s+person|background\s+person\s+is\s+distracting/i.test(
    t,
  );

  const hasBackgroundPeople = /background\s+(people|person|figure)|people\s+in\s+the\s+background|bystanders?/i.test(
    t,
  );

  const hasPartially = /partially\s+visible|cut\s+off|edge\s+of\s+(the\s+)?frame|partially\s+out/i.test(
    t,
  );

  const hasSecondary = count > 1 || hasBackgroundPeople || hasPhotobombers;

  return {
    count,
    hasPrimarySubject: count >= 1,
    hasSecondaryPeople: hasSecondary,
    hasBackgroundPeople,
    hasPhotobombers,
    hasPartiallyVisiblePeople: hasPartially,
  };
}

export function analyzeFaces(visionText: string): FaceAnalysis {
  const t = visionText.toLowerCase();

  const detected = /\bface\b|\bfacial\b|\bportrait\b|\bselfie\b|\beyes?\b|\bnose\b|\bmouth\b|\bskin\b/i.test(
    t,
  );

  const count = !detected
    ? 0
    : /multiple\s+faces|several\s+faces|(\d+)\s+faces/i.test(t)
    ? 2
    : 1;

  const blurry = /face\s+is\s+blur|blur(ry)?\s+face|soft\s+face|out\s+of\s+focus\s+face/i.test(
    t,
  );

  const hasArtifacts = /face\s+artifact|artifact.{0,20}face|distort.{0,20}face|face.{0,20}distort/i.test(
    t,
  );

  const redEye = /red.eye|redeye/i.test(t);

  const poorLighting = /face\s+is\s+(too\s+)?(dark|bright|shadow)|shadow\s+on\s+(the\s+)?face|overexpos.{0,20}face|underexpos.{0,20}fa ce/i.test(
    t,
  );

  const occluded = /face\s+is\s+(partially\s+)?covered|obstructed\s+face|hidden\s+face|occluded\s+face/i.test(
    t,
  );

  const primaryFaceVisible = detected && !occluded && !/(no\s+face|face\s+not\s+visible)/i.test(t);

  return {
    detected,
    count,
    primaryFaceVisible,
    blurry,
    hasArtifacts,
    redEye,
    poorLighting,
    occluded,
  };
}
