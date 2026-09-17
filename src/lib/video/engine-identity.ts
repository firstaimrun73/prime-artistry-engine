/**
 * Customer-facing engine identity for Video Studio.
 * Never expose provider or model names — only this branded string.
 */
export const MOTIO2EDIT_ENGINE_NAME = "Motion Engine";
/** Prefer app version constant when available; fallback for display. */
export const MOTIO2EDIT_ENGINE_VERSION = "1.8.6";
export const MOTIO2EDIT_ENGINE_TAGLINE = "Powered by Motio2edit AI";

export function engineIdentityLine(): string {
  return `${MOTIO2EDIT_ENGINE_NAME} · ${MOTIO2EDIT_ENGINE_TAGLINE}`;
}
