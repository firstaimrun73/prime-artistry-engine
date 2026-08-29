/** Client preference for optional watermark (paid plans). Free is forced server-side. */
export function readKeepWatermarkPref(): boolean {
  try {
    const v = localStorage.getItem("motio2edit-watermark-pref");
    if (v === "off") return false;
    if (v === "on") return true;
  } catch {
    /* ignore */
  }
  return true;
}
