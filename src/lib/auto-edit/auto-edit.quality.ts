/**
 * Auto Edit quality options — Maluto AI is HD-capped.
 */
import {
  AUTO_EDIT_CREDITS_BY_QUALITY,
  AUTO_EDIT_TARGET_MP,
  type AutoEditQuality,
} from "./constants";
import {
  AUTO_EDIT_QUALITIES_BY_PLAN,
  planAllowsAutoEditQuality,
} from "./entitlements";
import type { PlanId } from "@/lib/plans";

export type { AutoEditQuality };

export type AutoEditQualityOption = {
  id: AutoEditQuality;
  label: string;
  credits: number;
  targetMegapixels: number;
  hint: string;
};

/** Catalog shown in Maluto AI Studio (HD only). */
export const AUTO_EDIT_QUALITY_OPTIONS: readonly AutoEditQualityOption[] = [
  {
    id: "sd",
    label: "SD",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY.sd,
    targetMegapixels: AUTO_EDIT_TARGET_MP.sd,
    hint: "Standard — fast restore",
  },
  {
    id: "hd",
    label: "HD",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY.hd,
    targetMegapixels: AUTO_EDIT_TARGET_MP.hd,
    hint: "Full HD restore",
  },
] as const;

export function getAutoEditQualityOption(
  id: AutoEditQuality,
): AutoEditQualityOption | undefined {
  return AUTO_EDIT_QUALITY_OPTIONS.find((o) => o.id === id);
}

export function autoEditQualitiesForPlan(
  plan: string | null | undefined,
): readonly AutoEditQualityOption[] {
  const id = (plan ?? "free") as PlanId;
  const allowed = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  return AUTO_EDIT_QUALITY_OPTIONS.filter((o) => allowed.includes(o.id));
}

export function defaultAutoEditQualityForPlan(
  plan: string | null | undefined,
): AutoEditQuality {
  const opts = autoEditQualitiesForPlan(plan);
  if (opts.some((o) => o.id === "hd")) return "hd";
  return opts[0]?.id ?? "hd";
}

export function isAutoEditQualityAllowedForPlan(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  return planAllowsAutoEditQuality(plan, quality);
}
