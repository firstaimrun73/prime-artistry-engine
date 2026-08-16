/**
 * Google Website Translator integration for Motio2edit.
 * - Hidden Google Translate element drives real page translation
 * - Visible Motio2edit-styled language control (desktop + mobile)
 * - Preference persisted in localStorage + googtrans cookie
 * - No API keys required (uses public element.js)
 */

import { useEffect, useRef, useState } from "react";
import { Languages } from "lucide-react";

const STORAGE_KEY = "motio2edit-gt-lang";
const PAGE_LANG = "en";

/** User-requested languages (Google Translate language codes). */
export const GT_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "ru", label: "Russian" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh-CN", label: "Chinese" },
  { code: "ar", label: "Arabic" },
  { code: "tr", label: "Turkish" },
  { code: "nl", label: "Dutch" },
  { code: "pl", label: "Polish" },
] as const;

export type GtLangCode = (typeof GT_LANGUAGES)[number]["code"];

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: {
      translate?: {
        TranslateElement: new (
          options: {
            pageLanguage: string;
            includedLanguages?: string;
            autoDisplay?: boolean;
            layout?: number;
          },
          elementId: string,
        ) => void;
      };
    };
  }
}

function setGoogTransCookie(target: string) {
  const value = target === PAGE_LANG ? "" : `/${PAGE_LANG}/${target}`;
  const expire = target === PAGE_LANG ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Thu, 01 Jan 2099 00:00:00 GMT";
  const domains = ["", window.location.hostname];
  // Host + root domain variants improve persistence across subdomains
  const parts = window.location.hostname.split(".");
  if (parts.length > 2) {
    domains.push(`.${parts.slice(-2).join(".")}`);
  }
  for (const domain of domains) {
    const domainPart = domain ? `; domain=${domain}` : "";
    document.cookie = `googtrans=${value}; expires=${expire}; path=/${domainPart}`;
  }
}

function readStoredLang(): string {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s && GT_LANGUAGES.some((l) => l.code === s)) return s;
  } catch {
    /* ignore */
  }
  try {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
    if (m?.[1] && GT_LANGUAGES.some((l) => l.code === m[1])) return m[1];
  } catch {
    /* ignore */
  }
  return PAGE_LANG;
}

function fireComboChange(combo: HTMLSelectElement, lang: string) {
  combo.value = lang;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyLanguage(lang: string) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore */
  }
  setGoogTransCookie(lang);

  const combo =
    (document.querySelector("#google_translate_element select.goog-te-combo") as HTMLSelectElement | null) ||
    (document.querySelector("select.goog-te-combo") as HTMLSelectElement | null);

  if (combo) {
    fireComboChange(combo, lang);
    // Google sometimes needs a second tick
    setTimeout(() => fireComboChange(combo, lang), 200);
    return;
  }

  // Widget not ready yet — cookie is set; soft reload so GT picks it up
  if (lang !== PAGE_LANG) {
    window.location.reload();
  } else {
    // Reset to English: clear and reload
    setGoogTransCookie(PAGE_LANG);
    window.location.reload();
  }
}

function injectHideStyles() {
  if (document.getElementById("motio-gt-hide-style")) return;
  const style = document.createElement("style");
  style.id = "motio-gt-hide-style";
  style.textContent = `
    .goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt,
    .goog-te-menu-frame, .skiptranslate iframe.goog-te-banner-frame {
      display: none !important; visibility: hidden !important;
    }
    body { top: 0 !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    #google_translate_element { position: absolute !important; left: -9999px !important;
      width: 1px !important; height: 1px !important; overflow: hidden !important; }
    .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf { display: none !important; }
  `;
  document.head.appendChild(style);
}

function ensureGoogleScript() {
  if (document.getElementById("google-translate-script")) return;
  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

function LanguageControl({
  value,
  onChange,
  compact,
}: {
  value: string;
  onChange: (code: string) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex items-center gap-1.5 ${compact ? "" : ""}`}>
      <Languages className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <label htmlFor="motio-gt-lang" className="sr-only">
        Language
      </label>
      <select
        id="motio-gt-lang"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="max-w-[9.5rem] cursor-pointer rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary sm:max-w-[11rem]"
        aria-label="Select language"
      >
        {GT_LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Floating control (always available) + hidden Google Translate mount.
 * Also exports LanguageControl for Header if desired.
 */
export function TranslateWidget() {
  const [lang, setLang] = useState(PAGE_LANG);
  const [ready, setReady] = useState(false);
  const initOnce = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initOnce.current) return;
    initOnce.current = true;

    injectHideStyles();

    const initial = readStoredLang();
    setLang(initial);
    if (initial !== PAGE_LANG) {
      setGoogTransCookie(initial);
    }

    window.googleTranslateElementInit = () => {
      try {
        if (!window.google?.translate?.TranslateElement) return;
        const included = GT_LANGUAGES.map((l) => l.code).join(",");
        // eslint-disable-next-line no-new
        new window.google.translate.TranslateElement(
          {
            pageLanguage: PAGE_LANG,
            includedLanguages: included,
            autoDisplay: false,
          },
          "google_translate_element",
        );
        setReady(true);

        // Re-apply stored language after widget builds the combo
        const stored = readStoredLang();
        if (stored && stored !== PAGE_LANG) {
          setTimeout(() => {
            const combo = document.querySelector(
              "select.goog-te-combo",
            ) as HTMLSelectElement | null;
            if (combo) fireComboChange(combo, stored);
          }, 400);
        }
      } catch (e) {
        console.warn("[TranslateWidget] init failed", e);
      }
    };

    // Mount hidden host if missing
    if (!document.getElementById("google_translate_element")) {
      const host = document.createElement("div");
      host.id = "google_translate_element";
      host.setAttribute("aria-hidden", "true");
      document.body.appendChild(host);
    }

    ensureGoogleScript();
  }, []);

  const onChange = (code: string) => {
    setLang(code);
    applyLanguage(code);
  };

  return (
    <>
      {/* Accessible language control — fixed, non-intrusive */}
      <div
        className="fixed bottom-20 right-3 z-[60] rounded-lg border border-border bg-card/95 p-1.5 shadow-md backdrop-blur md:bottom-4 md:right-4"
        data-no-translate
      >
        <LanguageControl value={lang} onChange={onChange} />
        {!ready && (
          <span className="sr-only">Loading translator…</span>
        )}
      </div>
    </>
  );
}

/** Compact selector for Header / Settings (shares same GT engine). */
export function GoogleLanguageSelect({ className }: { className?: string }) {
  const [lang, setLang] = useState(PAGE_LANG);

  useEffect(() => {
    setLang(readStoredLang());
  }, []);

  return (
    <div className={className} data-no-translate>
      <LanguageControl
        value={lang}
        onChange={(code) => {
          setLang(code);
          applyLanguage(code);
        }}
        compact
      />
    </div>
  );
}
