/**
 * Motio2edit Filters editor — temporary restore entry.
 * Full live UI is restored from the last known good blob via registry + routes.
 * This file re-exports a minimal safe shell if needed; primary implementation
 * is reloaded from EffectStudioPage which routes use.
 */
export { EffectStudioPage, filterToCatalogItem } from "./EffectStudioPage.impl";
export type { CatalogItem } from "./EffectStudioPage.impl";
