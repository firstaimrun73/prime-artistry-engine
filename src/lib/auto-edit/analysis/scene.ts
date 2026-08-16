/**
 * Auto Edit — Scene classification helper
 */
import type { SceneType } from "../types";

// A small, conservative scene classifier used by the Auto Edit analysis layer.
// This intentionally keeps decisions simple and relies on vision model output
// (the plain text / scene hints) rather than attempting to re-implement vision.
export function classifyScene(text: string): SceneType {
  const t = (text ?? "").toLowerCase();

  if (/portrait|headshot|selfie/.test(t)) return "portrait";
  if (/landscape|scenery|mountain|valley|river|lake|beach|sunset|sunrise/.test(t)) return "landscape";
  if (/night|stars|nighttime|astro|low light/.test(t)) return "night";
  if (/indoor|room|studio|kitchen|living room|bathroom/.test(t)) return "indoor";
  if (/food|dish|meal|plate|cooking/.test(t)) return "food";
  if (/animal|dog|cat|pet|wildlife/.test(t)) return "animal";
  if (/product|studio product|product shot|commerce/.test(t)) return "product";
  if (/document|paper|scan|id card|passport|receipt/.test(t)) return "document";

  return "other";
}
