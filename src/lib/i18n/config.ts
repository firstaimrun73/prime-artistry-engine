export const LOCALES = [
  "en-US",
  "en-GB",
  "en-CA",
  "de",
  "fr",
  "fr-CA",
  "it",
  "nl",
  "pl",
  "vi",
] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en-US";

export const LOCALE_STORAGE_KEY = "motio2edit-locale";

export type LocaleMeta = {
  code: Locale;
  label: string;
  flag: string;
};

export const LOCALE_OPTIONS: LocaleMeta[] = [
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "en-GB", label: "English (UK)", flag: "🇬🇧" },
  { code: "en-CA", label: "English (Canada)", flag: "🇨🇦" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
  { code: "fr-CA", label: "Français (Canada)", flag: "🇨🇦" },
  { code: "it", label: "Italiano", flag: "🇮🇹" },
  { code: "nl", label: "Nederlands", flag: "🇳🇱" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "vi", label: "Tiếng Việt", flag: "🇻🇳" },
];

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}
