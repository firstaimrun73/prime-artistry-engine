import type { GlassDefinition, GlassId } from "./types";

export const GLASS_CATALOG: GlassDefinition[] = [
  { id: "none", name: "None", opacity: 0, frost: 0, reflection: 0, enabled: true },
  { id: "clear", name: "Clear Glass", opacity: 0.06, frost: 0, reflection: 0.22, enabled: true },
  { id: "soft", name: "Soft Glass", opacity: 0.1, frost: 0.08, reflection: 0.28, enabled: true },
  { id: "frosted", name: "Frosted Glass", opacity: 0.12, frost: 0.35, reflection: 0.18, enabled: true },
  { id: "matte", name: "Matte Glass", opacity: 0.08, frost: 0.2, reflection: 0.08, enabled: true },
  { id: "gloss", name: "Gloss Glass", opacity: 0.07, frost: 0, reflection: 0.42, enabled: true },
  { id: "museum", name: "Museum Glass", opacity: 0.04, frost: 0.02, reflection: 0.12, enabled: true },
  {
    id: "reflective",
    name: "Reflective Glass",
    opacity: 0.1,
    frost: 0,
    reflection: 0.55,
    enabled: true,
  },
  {
    id: "tinted",
    name: "Tinted Glass",
    opacity: 0.12,
    frost: 0.05,
    reflection: 0.2,
    tint: "rgba(40,60,90,0.12)",
    enabled: true,
  },
];

export function getGlassById(id: string): GlassDefinition | undefined {
  return GLASS_CATALOG.find((g) => g.id === id && g.enabled);
}

export const DEFAULT_GLASS_ID: GlassId = "clear";
