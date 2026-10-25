"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, type Dictionary } from "@/i18n/getDictionary";
import { LOCALE_DIR, type Locale } from "@/i18n/locales";
import type { AgeGroup } from "./ageGroups";
import { AGE_GROUP_COOKIE, LOCALE_COOKIE, writeClientCookie } from "./cookies";

type PreferencesValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  t: Dictionary;
  ageGroup: AgeGroup | null;
  setLocale: (locale: Locale) => void;
  setAgeGroup: (ageGroup: AgeGroup) => void;
};

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({
  initialLocale,
  initialAgeGroup,
  children,
}: {
  initialLocale: Locale;
  initialAgeGroup: AgeGroup | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const [locale, setLocaleState] = useState(initialLocale);
  const [ageGroup, setAgeGroupState] = useState(initialAgeGroup);

  const setLocale = useCallback(
    (next: Locale) => {
      writeClientCookie(LOCALE_COOKIE, next);
      setLocaleState(next);
      // Update <html> immediately; the refresh re-renders server parts (titles, html attributes).
      document.documentElement.lang = next;
      document.documentElement.dir = LOCALE_DIR[next];
      router.refresh();
    },
    [router],
  );

  const setAgeGroup = useCallback((next: AgeGroup) => {
    writeClientCookie(AGE_GROUP_COOKIE, next);
    setAgeGroupState(next);
  }, []);

  const value = useMemo<PreferencesValue>(
    () => ({
      locale,
      dir: LOCALE_DIR[locale],
      t: getDictionary(locale),
      ageGroup,
      setLocale,
      setAgeGroup,
    }),
    [locale, ageGroup, setLocale, setAgeGroup],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside PreferencesProvider");
  return value;
}
