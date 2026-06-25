// Lightweight IP geolocation with localStorage caching.
// Used for auto currency + language suggestion. Never blocks render.

const COUNTRY_KEY = "motio2edit-country";

export async function detectCountry(): Promise<string | null> {
  try {
    const cached = localStorage.getItem(COUNTRY_KEY);
    if (cached) return cached;
  } catch {
    /* ignore */
  }
  try {
    const res = await fetch("https://ipapi.co/json/");
    if (!res.ok) return null;
    const data = await res.json();
    const code = (data?.country_code as string | undefined) ?? null;
    if (code) {
      try {
        localStorage.setItem(COUNTRY_KEY, code);
      } catch {
        /* ignore */
      }
    }
    return code;
  } catch {
    return null;
  }
}
