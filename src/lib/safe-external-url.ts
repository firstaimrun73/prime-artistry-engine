/**
 * Shared HTTPS + private-network URL guard (SSRF mitigation for media inputs).
 */
export function isSafeExternalUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      host.endsWith(".localhost") ||
      host === "metadata.google.internal"
    ) {
      return false;
    }
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const parts = ipv4.slice(1).map((x) => Number(x));
      if (parts.some((n) => n > 255)) return false;
      const [a, b] = parts;
      if (a === 10) return false;
      if (a === 127) return false;
      if (a === 0) return false;
      if (a === 169 && b === 254) return false;
      if (a === 172 && b >= 16 && b <= 31) return false;
      if (a === 192 && b === 168) return false;
      if (a === 100 && b >= 64 && b <= 127) return false;
    }
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function assertSafeMediaUrl(url: string, label = "media"): void {
  if (!isSafeExternalUrl(url)) {
    throw new Error(`Invalid ${label} URL.`);
  }
}
