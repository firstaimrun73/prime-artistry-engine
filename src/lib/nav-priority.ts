/**
 * Country-aware bottom-nav priority.
 * Most emerging markets: Studio first (create), Pricing second, Discover/Home third.
 * Soft geo from timezone + language (client); never blocks product access.
 */

export type NavTabId = "home" | "studio" | "maluto" | "pricing" | "profile";

/** Markets where Image Studio is the primary job-to-be-done. */
const STUDIO_FIRST_COUNTRIES = new Set([
  "IN",
  "ID",
  "PH",
  "BD",
  "PK",
  "NG",
  "EG",
  "BR",
  "MX",
  "VN",
  "TH",
  "TR",
  "ZA",
  "KE",
  "GH",
  "LK",
  "NP",
  "MM",
  "CO",
  "AR",
]);

function guessCountryCode(): string | null {
  if (typeof navigator === "undefined") return null;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "IN";
    if (tz.startsWith("Asia/Jakarta") || tz.startsWith("Asia/Makassar")) return "ID";
    if (tz.startsWith("Asia/Manila")) return "PH";
    if (tz.startsWith("Asia/Dhaka")) return "BD";
    if (tz.startsWith("Asia/Karachi")) return "PK";
    if (tz.startsWith("Africa/Lagos")) return "NG";
    if (tz.startsWith("Africa/Cairo")) return "EG";
    if (tz.startsWith("America/Sao_Paulo")) return "BR";
    if (tz.startsWith("America/Mexico_City")) return "MX";
    if (tz.startsWith("Asia/Ho_Chi_Minh") || tz.startsWith("Asia/Saigon")) return "VN";
    if (tz.startsWith("Asia/Bangkok")) return "TH";
    if (tz.startsWith("Europe/Istanbul")) return "TR";
    if (tz.startsWith("Africa/Johannesburg")) return "ZA";
  } catch {
    /* ignore */
  }
  const lang = (navigator.language || "").toLowerCase();
  if (lang.startsWith("hi") || lang.endsWith("-in")) return "IN";
  if (lang.startsWith("id")) return "ID";
  if (lang.startsWith("fil") || lang.startsWith("tl")) return "PH";
  if (lang.startsWith("bn")) return "BD";
  if (lang.startsWith("pt-br")) return "BR";
  if (lang.startsWith("es-mx")) return "MX";
  return null;
}

/**
 * Order of bottom tabs for signed-in mobile users.
 * studio-first markets: Studio → Pricing → Home → Maluto → Profile
 * default: Home → Studio → Maluto → Pricing → Profile
 */
export function bottomNavOrder(): NavTabId[] {
  const cc = guessCountryCode();
  if (cc && STUDIO_FIRST_COUNTRIES.has(cc)) {
    return ["studio", "pricing", "home", "maluto", "profile"];
  }
  return ["home", "studio", "maluto", "pricing", "profile"];
}

export function isStudioFirstMarket(): boolean {
  const cc = guessCountryCode();
  return !!cc && STUDIO_FIRST_COUNTRIES.has(cc);
}
