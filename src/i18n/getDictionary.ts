import he from "./dictionaries/he";
import en from "./dictionaries/en";
import ru from "./dictionaries/ru";
import type { Locale } from "./locales";

// Hebrew is the reference: other languages must provide exactly the same keys.
export type Dictionary = typeof he;

const dictionaries: Record<Locale, Dictionary> = { he, en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function format(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}
