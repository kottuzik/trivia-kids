export const LOCALES = ["he", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "he";

export const LOCALE_DIR: Record<Locale, "rtl" | "ltr"> = {
  he: "rtl",
  en: "ltr",
  ru: "ltr",
};

// Each language is shown in its own name so a child can find it in any UI language.
export const LOCALE_NATIVE_NAME: Record<Locale, string> = {
  he: "עברית",
  en: "English",
  ru: "Русский",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
