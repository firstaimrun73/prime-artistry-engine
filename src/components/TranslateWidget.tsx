/**
 * Google Website Translator for Motio2edit.
 *
 * Single UI surface: GoogleLanguageSelect (icon → menu) in the Header.
 * TranslateWidget only initializes the hidden GT engine (no floating control).
 *
 * Ukrainian (uk) is supported. On first visit (no saved language), visitors whose
 * IP resolves to Ukraine (country code UA) are auto-set to Ukrainian. A manual
 * language pick is always respected and never overwritten by geo.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "motio2edit-gt-lang";
/** "user" = explicit pick; "geo" = auto from IP — geo can refresh on country change */
const SOURCE_KEY = "motio2edit-gt-lang-source";
const PAGE_LANG = "en";

export const GT_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "uk", label: "Ukrainian" },
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

function isSupportedLang(code: string): code is GtLangCode {
  return GT_LANGUAGES.some((l) => l.code === code);
}

function setGoogTransCookie(target: string) {
  const value = target === PAGE_LANG ? "" : `/${PAGE_LANG}/${target}`;
  const expire =
    target === PAGE_LANG ? "Thu, 01 Jan 1970 00:00:00 GMT" : "Thu, 01 Jan 2099 00:00:00 GMT";
  const domains = ["", window.location.hostname];
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
    if (s && isSupportedLang(s)) return s;
  } catch {
    /* ignore */
  }
  try {
    const m = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
    if (m?.[1] && isSupportedLang(m[1])) return m[1];
  } catch {
    /* ignore */
  }
  return PAGE_LANG;
}

function readLangSource(): "user" | "geo" | null {
  try {
    const s = localStorage.getItem(SOURCE_KEY);
    if (s === "user" || s === "geo") return s;
  } catch {
    /* ignore */
  }
  return null;
}

function persistLang(lang: string, source: "user" | "geo") {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(SOURCE_KEY, source);
  } catch {
    /* ignore */
  }
}

function fireComboChange(combo: HTMLSelectElement, lang: string) {
  combo.value = lang;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyLanguage(lang: string, source: "user" | "geo" = "user") {
  persistLang(lang, source);
  setGoogTransCookie(lang);

  const combo =
    (document.querySelector("#google_translate_element select.goog-te-combo") as HTMLSelectElement | null) ||
    (document.querySelector("select.goog-te-combo") as HTMLSelectElement | null);

  if (combo) {
    fireComboChange(combo, lang);
    setTimeout(() => fireComboChange(combo, lang), 200);
    return;
  }

  window.location.reload();
}

/**
 * Resolve preferred language from IP country.
 * Ukraine (UA) → Ukrainian (uk). Other countries → null (keep English default).
 * Uses a lightweight public country lookup; fails soft to null.
 */
async function detectLangFromIp(): Promise<GtLangCode | null> {
  try {
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 3500);
    // country.is returns { country: "UA" } for the client IP
    const res = await fetch("https://api.country.is/", {
      signal: ctrl.signal,
      credentials: "omit",
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { country?: string };
    const cc = (data.country || "").toUpperCase();
    if (cc === "UA") return "uk";
    return null;
  } catch {
    return null;
  }
}

/** Browser Accept-Language hint when IP lookup is unavailable. */
function detectLangFromBrowser(): GtLangCode | null {
  try {
    const list = navigator.languages?.length ? navigator.languages : [navigator.language];
    for (const raw of list) {
      const tag = (raw || "").toLowerCase();
      if (tag.startsWith("uk")) return "uk";
      // map exact matches already in GT_LANGUAGES
      const base = tag.split("-")[0];
      if (isSupportedLang(tag)) return tag;
      if (isSupportedLang(base)) return base as GtLangCode;
      if (tag.startsWith("zh")) return "zh-CN";
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Auto language for visitors without a manual choice.
 * - User pick always wins.
 * - Geo (Ukraine → uk) applies on first visit and when last source was geo.
 */
async function resolveAutoLanguage(): Promise<string> {
  const source = readLangSource();
  if (source === "user") {
    return readStoredLang();
  }

  const fromIp = await detectLangFromIp();
  if (fromIp) {
    persistLang(fromIp, "geo");
    setGoogTransCookie(fromIp);
    return fromIp;
  }

  // If we already stored a geo lang and IP lookup failed this time, keep stored
  if (source === "geo") {
    return readStoredLang();
  }

  const fromBrowser = detectLangFromBrowser();
  if (fromBrowser && fromBrowser !== PAGE_LANG) {
    persistLang(fromBrowser, "geo");
    setGoogTransCookie(fromBrowser);
    return fromBrowser;
  }

  return PAGE_LANG;
}

function injectHideStyles() {
  if (document.getElementById("motio-gt-hide-style")) return;
  const style = document.createElement("style");
  style.id = "motio-gt-hide-style";
  style.textContent = `
    .goog-te-banner-frame, .goog-te-balloon-frame, #goog-gt-tt,
    .goog-te-menu-frame, iframe.goog-te-banner-frame, .goog-te-ftab-frame,
    .goog-te-gadget,
    .VIpgJd-ZVi9od-ORHb-OEVmcd, .VIpgJd-ZVi9od-aZ2wEe-wOHMyf,
    .VIpgJd-ZVi9od-l4eHX-hSRGPd {
      display: none !important;
      visibility: hidden !important;
      height: 0 !important;
      max-height: 0 !important;
      overflow: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    body { top: 0 !important; position: static !important; }
    html.translated-ltr body, html.translated-rtl body { top: 0 !important; }
    .goog-text-highlight { background: none !important; box-shadow: none !important; }
    #google_translate_element {
      position: absolute !important; left: -9999px !important;
      width: 1px !important; height: 1px !important; overflow: hidden !important;
    }
  `;
  document.head.appendChild(style);
}

function stripGoogleJunkNodes() {
  document
    .querySelectorAll(".goog-te-banner-frame, .goog-te-ftab-frame, iframe.goog-te-banner-frame")
    .forEach((el) => el.remove());
  document.body.style.top = "0";
  document.body.style.position = "static";
}

function ensureGoogleScript() {
  if (document.getElementById("google-translate-script")) return;
  const script = document.createElement("script");
  script.id = "google-translate-script";
  script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  script.async = true;
  document.body.appendChild(script);
}

/** Boot hidden Google Translate engine once (no visible UI). */
export function TranslateWidget() {
  const initOnce = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || initOnce.current) return;
    initOnce.current = true;

    injectHideStyles();

    let cancelled = false;

    void (async () => {
      const initial = await resolveAutoLanguage();
      if (cancelled) return;

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
          stripGoogleJunkNodes();

          const stored = readStoredLang();
          if (stored && stored !== PAGE_LANG) {
            setTimeout(() => {
              const combo = document.querySelector("select.goog-te-combo") as HTMLSelectElement | null;
              if (combo) fireComboChange(combo, stored);
              stripGoogleJunkNodes();
            }, 400);
          }
        } catch (e) {
          console.warn("[TranslateWidget] init failed", e);
        }
      };

      if (!document.getElementById("google_translate_element")) {
        const host = document.createElement("div");
        host.id = "google_translate_element";
        host.setAttribute("aria-hidden", "true");
        document.body.appendChild(host);
      }

      ensureGoogleScript();
    })();

    const obs = new MutationObserver(() => stripGoogleJunkNodes());
    obs.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelled = true;
      obs.disconnect();
    };
  }, []);

  return null;
}

/**
 * Single attractive language control: icon button → popover menu.
 * Labels stay English: whole control uses class "notranslate" + translate="no"
 * (Google ignores data-no-translate alone).
 * Mount once in Header (desktop + mobile). No floating select text.
 */
export function GoogleLanguageSelect({ className }: { className?: string }) {
  const [lang, setLang] = useState(PAGE_LANG);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveAutoLanguage();
      if (!cancelled) setLang(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const current = GT_LANGUAGES.find((l) => l.code === lang) ?? GT_LANGUAGES[0];

  const pick = (code: string) => {
    setLang(code);
    setOpen(false);
    applyLanguage(code, "user");
  };

  return (
    <div
      ref={rootRef}
      className={cn("relative notranslate", className)}
      translate="no"
      data-no-translate
    >
      <button
        type="button"
        aria-label={`Language: ${current.label}. Change language`}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors",
          "hover:border-primary/50 hover:text-primary",
          open && "border-primary text-primary",
        )}
      >
        <Languages className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute right-0 top-full z-[60] mt-2 max-h-[min(70vh,22rem)] w-[11.5rem] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl"
        >
          {GT_LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <button
                key={l.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => pick(l.code)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-semibold text-primary"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <span className="min-w-0 flex-1 truncate notranslate" translate="no">
                  {l.label}
                </span>
                {active && <Check className="h-3.5 w-3.5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
