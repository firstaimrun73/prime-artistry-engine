/**
 * Client helper for image downloads that must go through the server
 * watermark policy (free = primary+secondary, paid = optional primary).
 *
 * Prefer calling secureDownloadImage via useServerFn in components;
 * this module documents the contract for parallel call sites.
 */
export type SecureDownloadResult = {
  downloadUrl: string;
  watermarked: boolean;
  mode: "none" | "primary" | "primary+secondary";
};

/** Trigger a browser download from a URL (blob preferred when same-origin/cors allows). */
export async function triggerBrowserDownload(
  href: string,
  filename: string,
): Promise<void> {
  try {
    const res = await fetch(href);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
