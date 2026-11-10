import { useEffect } from "react";
import { ADS_CONFIG } from "@/config/ads";

const SCRIPT_ID = "motio-monetag-vignette";

/** Monetag Vignette — disabled while ADS_CONFIG.enabled is false. */
export function MonetagVignette() {
  useEffect(() => {
    if (!ADS_CONFIG.enabled) {
      document.getElementById(SCRIPT_ID)?.remove();
    }
  }, []);
  return null;
}
