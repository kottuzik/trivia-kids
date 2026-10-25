// Functional preference cookies (no tracking). Read on the server so the first HTML
// already has the right language, direction and selections.
export const LOCALE_COOKIE = "locale";
export const AGE_GROUP_COOKIE = "ageGroup";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function writeClientCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}
