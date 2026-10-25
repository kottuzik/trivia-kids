import { cookies } from "next/headers";
import { AGE_GROUP_COOKIE, LOCALE_COOKIE } from "@/lib/cookies";
import { isAgeGroup, type AgeGroup } from "@/lib/ageGroups";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./locales";

export async function getServerPreferences(): Promise<{
  locale: Locale;
  ageGroup: AgeGroup | null;
}> {
  const store = await cookies();
  const locale = store.get(LOCALE_COOKIE)?.value;
  const ageGroup = store.get(AGE_GROUP_COOKIE)?.value;
  return {
    locale: isLocale(locale) ? locale : DEFAULT_LOCALE,
    ageGroup: isAgeGroup(ageGroup) ? ageGroup : null,
  };
}
