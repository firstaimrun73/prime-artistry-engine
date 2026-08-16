/****
 * Auto Edit — minimal config
 */
export const ANALYSIS_MODEL = process.env.ANTHROPIC_ANALYSIS_MODEL ?? "claude-sonnet-4-5";
export const ANALYSIS_MAX_TOKENS = Number(process.env.ANTHROPIC_ANALYSIS_MAX_TOKENS ?? 2000);
