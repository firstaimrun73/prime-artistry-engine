// Floating Google Translate widget + first-visit language suggestion popup.
// Mounted globally from the root layout. Client-only.
import { useEffect, useRef, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { Languages, X } from "lucide-react";
import { detectCountry } from "@/lib/geo";


const SUPPORTED = "hi,es,fr,de,ar,zh-CN,ja,ko,pt,ru,bn,ta,ur";
const POPUP_KEY = "motio2edit-lang-popup-shown";

declare global {
  interface Window {
    googleTranslateElementInit?: () => void;
    google?: any;
  }
}

type Suggestion = { lang: string; text: string; yes: string; no: string };

const SUGGESTIONS: Record<string, Suggestion> = {
  IN: { lang: "hi", text: "Would you like to view this site in Hindi?", yes: "Yes, switch", no: "No, keep English" },
  JP: { lang: "ja", text: "日本語で表示しますか?", yes: "はい", no: "英語のまま" },
  AE: { lang: "ar", text: "هل تريد العرض بالعربية؟", yes: "نعم", no: "لا، أبق بالإنجليزية" },
  SA: { lang: "ar", text: "هل تريد العرض بالعربية؟", yes: "نعم", no: "لا، أبق بالإنجليزية" },
  EG: { lang: "ar", text: "هل تريد العرض بالعربية؟", yes: "نعم", no: "لا، أبق بالإنجليزية" },
};

function setGoogleLang(lang: string) {
  // Google Translate stores the chosen language in the `googtrans` cookie.
  const host = window.location.hostname;
  const value = `/en/${lang}`;
  document.cookie = `googtrans=${value};path=/`;
  document.cookie = `googtrans=${value};domain=.${host};path=/`;
  window.location.reload();
}

export function TranslateWidget() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const injected = useRef(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Hide the floating button whenever a fullscreen modal/lightbox is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const sync = () => setModalOpen(document.body.dataset.modalOpen === "1");
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(document.body, { attributes: true, attributeFilter: ["data-modal-open"] });
    return () => obs.disconnect();
  }, []);

  // FIX 4: only show on home + settings; hide on chat/editor/studio pages.
  const allowed = pathname === "/" || pathname.startsWith("/settings");


  // Inject the Google Translate script once.
  useEffect(() => {
    if (injected.current) return;
    injected.current = true;

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;
      new window.google.translate.TranslateElement(
        { pageLanguage: "en", includedLanguages: SUPPORTED, autoDisplay: false },
        "google_translate_element",
      );
    };

    const s = document.createElement("script");
    s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    s.async = true;
    document.body.appendChild(s);
  }, []);

  // First-visit language suggestion based on detected country.
  useEffect(() => {
    let shown = false;
    try {
      shown = !!localStorage.getItem(POPUP_KEY);
    } catch {
      /* ignore */
    }
    if (shown) return;
    detectCountry().then((country) => {
      if (!country) return;
      const s = SUGGESTIONS[country.toUpperCase()];
      if (s) setSuggestion(s);
      try {
        localStorage.setItem(POPUP_KEY, "1");
      } catch {
        /* ignore */
      }
    });
  }, []);

  if (!allowed || modalOpen) return null;

  return (
    <>

      {/* Suggestion popup */}
      {suggestion && (
        <div className="fixed bottom-28 right-3 z-[60] w-[min(18rem,calc(100vw-1.5rem))] rounded-xl border border-border bg-card p-4 shadow-xl">
          <p className="text-sm font-medium" dir="auto">
            {suggestion.text}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              onClick={() => setGoogleLang(suggestion.lang)}
            >
              {suggestion.yes}
            </button>
            <button
              className="flex-1 rounded-md border border-border px-3 py-1.5 text-xs font-medium"
              onClick={() => setSuggestion(null)}
            >
              {suggestion.no}
            </button>
          </div>
        </div>
      )}

      {/* Floating translate panel */}
      <div
        className="fixed right-3 z-[60] flex max-w-[calc(100vw-1.5rem)] flex-col items-end gap-2 sm:right-5"
        style={{ bottom: "calc(88px + env(safe-area-inset-bottom))" }}
      >
        <div
          className={`rounded-xl border border-border bg-card p-3 shadow-xl transition-all ${
            open ? "opacity-100" : "pointer-events-none h-0 overflow-hidden opacity-0"
          }`}
        >
          <div className="mb-1 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-muted-foreground">Translate</span>
            <button onClick={() => setOpen(false)} aria-label="Close translate">
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          </div>
          <div id="google_translate_element" />
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          aria-label="Translate this page"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105"
        >
          <Languages className="h-5 w-5" />
        </button>
      </div>
    </>
  );
}
