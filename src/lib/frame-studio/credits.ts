/** Frame Studio credit costs — single source of truth for server + docs. */
export const FRAME_CREDIT_COST = {
  common: 5,
  aiplus: 15,
  premium: 25,
} as const;

export type FrameTier = keyof typeof FRAME_CREDIT_COST;
