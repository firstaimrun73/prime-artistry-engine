import type { AspectRatioDefinition, AspectRatioId } from "./types";

/** IMAX is 1.43:1 — never treat as 16:9. Ultrawide is 21:9. */
export const ASPECT_RATIOS: AspectRatioDefinition[] = [
  { id: "1:1", label: "1:1", value: 1 },
  { id: "4:5", label: "4:5", value: 4 / 5 },
  { id: "3:4", label: "3:4", value: 3 / 4 },
  { id: "2:3", label: "2:3", value: 2 / 3 },
  { id: "4:3", label: "4:3", value: 4 / 3 },
  { id: "3:2", label: "3:2", value: 3 / 2 },
  { id: "5:4", label: "5:4", value: 5 / 4 },
  { id: "9:16", label: "9:16", value: 9 / 16 },
  { id: "16:9", label: "16:9", value: 16 / 9 },
  { id: "21:9", label: "21:9", value: 21 / 9 },
  { id: "1.43:1", label: "IMAX · 1.43:1", value: 1.43 },
  { id: "custom", label: "Custom", value: null },
];

export function getRatioById(id: AspectRatioId): AspectRatioDefinition | undefined {
  return ASPECT_RATIOS.find((r) => r.id === id);
}

export function isValidRatioId(id: string): id is AspectRatioId {
  return ASPECT_RATIOS.some((r) => r.id === id);
}

export const DEFAULT_RATIO_ID: AspectRatioId = "4:5";
