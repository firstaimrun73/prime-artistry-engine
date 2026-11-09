/**
 * Pre-login only: fixed circular language control on the right edge.
 * Reuses GoogleLanguageSelect logic via the shared TranslateWidget module.
 * Do not mount this on signed-in layouts.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { GT_LANGUAGES } from "@/components/TranslateWidget";

const STORAGE_KEY = "motio2edit-gt-lang";
const SOURCE_KEY = "motio2edit-gt-lang-source";
const PAGE_LANG = "en";

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

function fireComboChange(combo: HTMLSelectElement, lang: string) {
  combo.value = lang;
  combo.dispatchEvent(new Event("change", { bubbles: true }));
}

function applyLanguage(lang: string) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
    localStorage.setItem(SOURCE_KEY, "user");
  } catch {
    /* ignore */
  }
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

export function FloatingLanguageButton() {
  const [lang, setLang] = useState(PAGE_LANG);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(readStoredLang());
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
    applyLanguage(code);
  };

  return (
    <div
      ref={rootRef}
      className="fixed bottom-24 right-3 z-[55] notranslate sm:bottom-8 sm:right-5"
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
          "inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-lg transition-colors",
          "hover:border-primary/50 hover:text-primary",
          open && "border-primary text-primary",
        )}
      >
        <Languages className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          className="absolute bottom-full right-0 mb-2 max-h-[min(60vh,20rem)] w-[11.5rem] overflow-y-auto rounded-xl border border-border bg-card p-1.5 shadow-xl"
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
