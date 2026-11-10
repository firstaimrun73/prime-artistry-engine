import { useEffect } from "react";
import { ADS_CONFIG } from "@/config/ads";

const SCRIPT_ID = "motio-monetag-ipp";

/** Monetag In-Page Push — disabled while ADS_CONFIG.enabled is false. */
export function MonetagInPagePush() {
  useEffect(() => {
    if (!ADS_CONFIG.enabled) {
      document.getElementById(SCRIPT_ID)?.remove();
    }
  }, []);
  return null;
}
