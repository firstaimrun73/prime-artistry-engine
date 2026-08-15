import { LOCALE_OPTIONS, LOCALE_STORAGE_KEY, type Locale, isLocale, setLocale } from "@/lib/i18n";

/** Shared Settings language options (flags + labels). */
export const SETTINGS_LANGUAGES = LOCALE_OPTIONS.map((o) => ({
  code: o.code,
  label: `${o.flag} ${o.label}`,
}));

export { LOCALE_STORAGE_KEY, isLocale, setLocale };
export type { Locale };
