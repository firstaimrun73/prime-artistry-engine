/** Client-safe helpers for complimentary (approved free-access) entitlements. */

export type ComplimentaryTool =
  | "maluto"
  | "image"
  | "circle"
  | "filters"
  | "frames"
  | "video"
  | "music";

export const COMPLIMENTARY_TOOL_OPTIONS: { id: ComplimentaryTool; label: string }[] = [
  { id: "maluto", label: "Maluto AI restore" },
  { id: "image", label: "Image generation / edit" },
  { id: "circle", label: "Circle 2edit" },
  { id: "filters", label: "Filters" },
  { id: "frames", label: "Frames" },
  { id: "video", label: "Video Studio" },
  { id: "music", label: "Music Studio" },
];

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
