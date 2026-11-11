/** Client-safe helpers for complimentary (approved free-access) entitlements. */

export type ComplimentaryTool =
  | "maluto"
  | "image"
  | "circle"
  | "filters"
  | "frames"
  | "video"
  | "music";

/** Tools users may request interest in (form). */
export const COMPLIMENTARY_TOOL_OPTIONS: { id: ComplimentaryTool; label: string }[] = [
  { id: "maluto", label: "Maluto AI restore" },
  { id: "image", label: "Image generation / edit" },
  { id: "circle", label: "Circle 2edit" },
  { id: "filters", label: "Filters" },
  { id: "frames", label: "Frames" },
  { id: "video", label: "Video Studio" },
  { id: "music", label: "Music Studio" },
];

/**
 * Only these tools have server-side complimentary entitlement checks today.
 * Admin grant UI and review handler must not grant tools outside this list.
 */
export const ENFORCED_COMPLIMENTARY_TOOLS: ComplimentaryTool[] = ["maluto"];

export const ENFORCED_COMPLIMENTARY_TOOL_OPTIONS = COMPLIMENTARY_TOOL_OPTIONS.filter((t) =>
  ENFORCED_COMPLIMENTARY_TOOLS.includes(t.id),
);

export type ComplimentaryProfileFields = {
  complimentary_expires_at?: string | null;
  complimentary_tools?: string[] | null;
};

export function isComplimentaryActive(
  profile: ComplimentaryProfileFields | null | undefined,
  now = new Date(),
): boolean {
  if (!profile?.complimentary_expires_at) return false;
  const exp = new Date(profile.complimentary_expires_at).getTime();
  if (Number.isNaN(exp)) return false;
  return exp > now.getTime();
}

export function hasComplimentaryTool(
  profile: ComplimentaryProfileFields | null | undefined,
  tool: ComplimentaryTool,
): boolean {
  if (!isComplimentaryActive(profile)) return false;
  const tools = profile?.complimentary_tools ?? [];
  return tools.map((t) => t.toLowerCase()).includes(tool);
}
