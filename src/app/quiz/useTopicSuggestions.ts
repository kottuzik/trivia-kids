"use client";

import { useState } from "react";
import type { Locale } from "@/i18n/locales";
import type { AgeGroup } from "@/lib/ageGroups";
import { fetchTopicSuggestions } from "@/lib/game/api";

export type Suggestions =
  | { status: "idle" | "loading" | "error" }
  | { status: "done"; topics: string[] };

// AI topic ideas, shared by the game setup and the in-game settings panel.
export function useTopicSuggestions() {
  const [suggestions, setSuggestions] = useState<Suggestions>({ status: "idle" });

  async function loadSuggestions(locale: Locale, ageGroup: AgeGroup) {
    setSuggestions({ status: "loading" });
    try {
      const topics = await fetchTopicSuggestions({ locale, ageGroup });
      setSuggestions({ status: "done", topics });
    } catch {
      setSuggestions({ status: "error" });
    }
  }

  return { suggestions, loadSuggestions };
}
