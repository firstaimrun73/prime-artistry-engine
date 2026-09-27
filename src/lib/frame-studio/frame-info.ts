/**
 * Authoritative frame information for the catalog info panel.
 * Descriptions follow real catalog materials / geometry — not generic filler.
 */
import type { FrameDef, FrameTier } from "./catalog";

export type FrameInfo = {
  name: string;
  tierLabel: string;
  material: string;
  description: string;
  visual: string;
  special: string | null;
  ratios: string;
};

const TIER_LABEL: Record<FrameTier, string> = {
  common: "Common",
  aiplus: "AI+",
  premium: "Premium",
};

function ratioText(f: FrameDef): string {
  if ("all" in f.ratios && f.ratios.all) return "All aspect ratios";
  const r = f.ratios as { min?: number; max?: number };
  const parts: string[] = [];
  if (r.min != null) parts.push(`min ${r.min.toFixed(2)}`);
  if (r.max != null) parts.push(`max ${r.max.toFixed(2)}`);
  return parts.length ? parts.join(", ") : "All aspect ratios";
}

function materialOf(f: FrameDef): string {
  if (f.texture) return f.texture;
  if (f.kind === "glass") return "glass";
  if (f.polaroid) return "instant-print paper";
  if (f.filmreel || f.perf) return "film stock";
  if (f.camera) return "instant-camera body";
  if (f.color) return `solid mat (${f.color})`;
  return f.kind;
}

function describe(f: FrameDef): FrameInfo {
  const material = materialOf(f);
  const specials: string[] = [];
  if (f.kind === "glass") specials.push("Clear glass surface over the photo with reflection sheen");
  if (f.wide) specials.push("Wide mat border");
  if (f.polaroid) specials.push("Instant-print bottom margin");
  if (f.perf || f.filmreel) specials.push("Film-strip sprocket holes");
  if (f.browser) specials.push("Browser chrome bar with window controls");
  if (f.story) specials.push("Story-style rounded glass");
  if (f.notch) specials.push("Phone notch silhouette");
  if (f.stitched) specials.push("Visible stitch line around the mat");
  if (f.brackets) specials.push("Corner bracket marks");
  if (f.keyline) specials.push("Double-mat keyline");
  if (f.aurora) specials.push("Aurora gradient glass tint");
  if (f.camera) specials.push("Instant-camera body geometry");
  if (f.treasure) specials.push("Treasure / ornate edge treatment");

  let description: string;
  let visual: string;

  switch (f.texture) {
    case "walnut":
    case "oak":
    case "ebony":
    case "driftwood":
    case "bamboo":
      description = `Solid ${f.texture} wood moulding with directional grain.`;
      visual = "Wood-grain striations, bevel highlight, inner recess around the photo.";
      break;
    case "marbleW":
    case "marbleB":
      description = `${f.texture === "marbleB" ? "Dark" : "White"} marble mat with natural vein variation.`;
      visual = "Marble veins and soft pore noise; polished face with edge light.";
      break;
    case "leatherB":
    case "leatherT":
      description = `${f.texture === "leatherT" ? "Tan" : "Brown"} leather-wrapped mat.`;
      visual = "Leather grain pores and soft radial shading.";
      break;
    case "denim":
      description = "Woven denim fabric mat.";
      visual = "Diagonal twill weave with subtle thread highlights.";
      break;
    case "silver":
    case "rosegold":
    case "goldfoil":
    case "brass":
    case "copper":
    case "rust":
    case "museumGold":
      description = `Metallic ${f.texture} finish.`;
      visual = "Anisotropic metal sheen and specular streaks.";
      break;
    case "carbon":
      description = "Carbon-fiber pattern mat.";
      visual = "Cross-weave carbon cells with gloss overlay.";
      break;
    case "galaxy":
      description = "Deep space galaxy field mat.";
      visual = "Radial nebula gradient with star points.";
      break;
    case "holo":
      description = "Holographic iridescent mat.";
      visual = "Multi-hue holographic gradient.";
      break;
    case "paper":
    case "kraft":
    case "linen":
    case "bone":
      description = `${f.texture.charAt(0).toUpperCase() + f.texture.slice(1)} fiber mat.`;
      visual = "Paper/fiber noise and fine directional fibers.";
      break;
    case "concrete":
    case "cork":
    case "slate":
      description = `${f.texture.charAt(0).toUpperCase() + f.texture.slice(1)} surface mat.`;
      visual = "Mineral/aggregate pores and rough surface noise.";
      break;
    default:
      if (f.kind === "glass") {
        description = `${f.name} — glass frame treatment over the photograph.`;
        visual = "Transparent glass plate, edge catch-light, controlled tint/frost.";
      } else if (f.polaroid) {
        description = "Classic instant-print border with oversized bottom margin.";
        visual = "Clean paper body and recessed photo well.";
      } else if (f.color) {
        description = `Solid-color gallery mat (${f.name}).`;
        visual = "Flat mat color with bevel and inner shadow.";
      } else {
        description = `${f.name} frame from the Motio2edit catalog.`;
        visual = "Material-specific border with depth and photo recess.";
      }
  }

  return {
    name: f.name,
    tierLabel: TIER_LABEL[f.tier],
    material,
    description,
    visual,
    special: specials.length ? specials.join("; ") : null,
    ratios: ratioText(f),
  };
}

export function getFrameInfo(frame: FrameDef): FrameInfo {
  return describe(frame);
}
