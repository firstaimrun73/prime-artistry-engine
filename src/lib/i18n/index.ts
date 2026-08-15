import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  LOCALES,
  isLocale,
  type Locale,
} from "./config";
import type { TranslationDict } from "./types";
import enUS from "./locales/en-US";
import de from "./locales/de";
import fr from "./locales/fr";
import it from "./locales/it";
import nl from "./locales/nl";
import pl from "./locales/pl";
import vi from "./locales/vi";

const CATALOG: Partial<Record<Locale, TranslationDict>> = {
  "en-US": enUS,
  "en-GB": enUS,
  "en-CA": enUS,
  de,
  fr,
  "fr-CA": fr,
  it,
  nl,
  pl,
  vi,
};

let currentLocale: Locale = DEFAULT_LOCALE;
const listeners = new Set<(l: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(next: Locale) {
  if (!isLocale(next)) return;
  currentLocale = next;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
  }
  listeners.forEach((fn) => fn(next));
}

export function subscribeLocale(fn: (l: Locale) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translate a key. Falls back to en-US, then the key itself. Never returns undefined/null. */
export function t(key: string, locale?: Locale): string {
  const loc = locale ?? currentLocale;
  const primary = CATALOG[loc]?.[key];
  if (primary != null && primary !== "") return primary;
  const fallback = CATALOG["en-US"]?.[key];
  if (fallback != null && fallback !== "") return fallback;
  return key;
}

export function initLocaleFromStorage(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) {
      currentLocale = stored;
      if (typeof document !== "undefined") document.documentElement.lang = stored;
      return stored;
    }
  } catch {
    /* ignore */
  }
  currentLocale = DEFAULT_LOCALE;
  return DEFAULT_LOCALE;
}

export function useI18n() {
  const [locale, setLoc] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
      const s = localStorage.getItem(LOCALE_STORAGE_KEY);
      return isLocale(s) ? s : DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  });

  useEffect(() => {
    initLocaleFromStorage();
    return subscribeLocale(setLoc);
  }, []);

  const translate = useCallback((key: string) => t(key, locale), [locale]);

  const changeLocale = useCallback((next: Locale) => {
    setLocale(next);
    setLoc(next);
  }, []);

  return useMemo(
    () => ({ locale, t: translate, setLocale: changeLocale, locales: LOCALES }),
    [locale, translate, changeLocale],
  );
}

export { LOCALES, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale };
export type { Locale };
