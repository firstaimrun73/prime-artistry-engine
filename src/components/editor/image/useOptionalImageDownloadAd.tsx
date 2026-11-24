import { useCallback, useState, type ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin-config";
import { FreeDownloadAdPrompt } from "@/components/ads";

const KEY = "motio_opt_ad_download_v1";

/**
 * Optional first-download ad gate for free users only.
 * Paid / admin never see the prompt. Download always runs after Continue / Watch Ad.
 */
export function useOptionalImageDownloadAd(
  executeDownload: () => void | Promise<void>,
): { requestDownload: () => void; downloadAdPrompt: ReactNode } {
  const { profile } = useAuth();
  const [show, setShow] = useState(false);
  const isFree = profile?.plan === "free" && !isAdminEmail(profile?.email);

  const requestDownload = useCallback(() => {
    if (isFree) {
      try {
        if (localStorage.getItem(KEY) !== "1") {
          setShow(true);
          return;
        }
      } catch {
        /* private mode — skip prompt */
      }
    }
    void executeDownload();
  }, [isFree, executeDownload]);

  const downloadAdPrompt = (
    <FreeDownloadAdPrompt
      trigger={show}
      onContinue={() => {
        setShow(false);
        void executeDownload();
      }}
    />
  );

  return { requestDownload, downloadAdPrompt };
}
