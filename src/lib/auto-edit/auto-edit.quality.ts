/**
 * Auto Edit–only quality options.
 *
 * Isolated from global IMAGE_QUALITY_OPTIONS so Standard / Premium / Ultra /
 * Video / Music quality lists are never affected by Auto Edit tiers (incl. 8k_max).
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
  /** API / backend id — must match AutoEditQuality exactly. */
  id: AutoEditQuality;
  /** UI label only. */
  label: string;
  /** Total Auto Edit credits for this quality (not a second charge). */
  credits: number;
  /** Target megapixels recorded for history / planning. */
  targetMegapixels: number;
  hint: string;
};

/** Full Auto Edit quality catalog (backend + UI). */
export const AUTO_EDIT_QUALITY_OPTIONS: readonly AutoEditQualityOption[] = [
  {
    id: "sd",
    label: "SD",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY.sd,
    targetMegapixels: AUTO_EDIT_TARGET_MP.sd,
    hint: "Standard — fast Auto Edit",
  },
  {
    id: "hd",
    label: "HD",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY.hd,
    targetMegapixels: AUTO_EDIT_TARGET_MP.hd,
    hint: "Full HD Auto Edit",
  },
  {
    id: "2k",
    label: "2K",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY["2k"],
    targetMegapixels: AUTO_EDIT_TARGET_MP["2k"],
    hint: "2K target detail",
  },
  {
    id: "4k",
    label: "4K",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY["4k"],
    targetMegapixels: AUTO_EDIT_TARGET_MP["4k"],
    hint: "4K target detail",
  },
  {
    id: "8k",
    label: "8K",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY["8k"],
    targetMegapixels: AUTO_EDIT_TARGET_MP["8k"],
    hint: "8K target detail",
  },
  {
    id: "8k_max",
    label: "8K Max",
    credits: AUTO_EDIT_CREDITS_BY_QUALITY["8k_max"],
    targetMegapixels: AUTO_EDIT_TARGET_MP["8k_max"],
    hint: "Maximum Auto Edit quality (Master Studio)",
  },
] as const;

export function getAutoEditQualityOption(
  id: AutoEditQuality,
): AutoEditQualityOption | undefined {
  return AUTO_EDIT_QUALITY_OPTIONS.find((o) => o.id === id);
}

/** Qualities visible in the Auto Edit UI for a plan (frontend filter only). */
export function autoEditQualitiesForPlan(
  plan: string | null | undefined,
): readonly AutoEditQualityOption[] {
  const id = (plan ?? "free") as PlanId;
  const allowed = AUTO_EDIT_QUALITIES_BY_PLAN[id] ?? AUTO_EDIT_QUALITIES_BY_PLAN.free;
  return AUTO_EDIT_QUALITY_OPTIONS.filter((o) => allowed.includes(o.id));
}

/** Pick default quality for plan (prefer HD when available). */
export function defaultAutoEditQualityForPlan(
  plan: string | null | undefined,
): AutoEditQuality {
  const opts = autoEditQualitiesForPlan(plan);
  if (opts.some((o) => o.id === "hd")) return "hd";
  return opts[0]?.id ?? "hd";
}

/** Whether the plan may request this quality (mirrors server entitlement). */
export function isAutoEditQualityAllowedForPlan(
  plan: string | null | undefined,
  quality: AutoEditQuality,
): boolean {
  return planAllowsAutoEditQuality(plan, quality);
}
