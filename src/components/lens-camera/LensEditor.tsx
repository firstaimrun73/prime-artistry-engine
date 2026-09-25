/**
 * Motio2edit Lenses — single-viewport Snapchat-style camera UI.
 * ONE visual preview at a time. Video is hero; canvas overlays same geometry.
 * Throttled optical RAF (~12fps). Lens change never restarts camera.
 * Shutter is the fixed center anchor of the lens carousel.
 *
 * Restored from last successful production commit (5120036) to unblock Filters deploy.
 */
export { LensEditor } from "./LensEditor.impl";
