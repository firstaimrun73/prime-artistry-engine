/** Remove BG product constants — Motio2edit */

export const REMOVE_BG_CREDITS = 20;

/** Free plan: SD (max long edge). Paid: HD (full resolution from model). */
export const REMOVE_BG_SD_MAX_EDGE = 1024;
export const REMOVE_BG_HD_MAX_EDGE = 4096;

export type RemoveBgQuality = "sd" | "hd";

export const REMOVE_BG_PRODUCT_NAME = "Remove BG";
export const REMOVE_BG_ROUTE = "/studio/image/remove-bg" as const;

/** FAL background removal model (server-only). */
export const REMOVE_BG_FAL_MODEL = "fal-ai/bria/background/remove";
