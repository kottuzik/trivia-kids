"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button, ButtonLink } from "@/components/Button";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { HomeIllustration } from "@/components/HomeIllustration";
import { useNewGameConfirm } from "@/components/NewGameConfirm";
import { format } from "@/i18n/getDictionary";
import { LOCALES, LOCALE_NATIVE_NAME, type Locale } from "@/i18n/locales";
import { AGE_GROUPS, type AgeGroup } from "@/lib/ageGroups";
import { useGame } from "@/lib/game/GameProvider";
import { usePreferences } from "@/lib/preferences";
import styles from "./page.module.css";

const AGE_TONES = ["mint", "yellow", "pink"] as const;

export function HomeScreen() {
  const { t, locale, setLocale, ageGroup, setAgeGroup } = usePreferences();
  const router = useRouter();
  const { state, hydrated, hasActiveGame, reset } = useGame();
  const { requestNewGame, dialog } = useNewGameConfirm();
  const ageGroupRef = useRef<HTMLFieldSetElement>(null);
  const [showAgeMessage, setShowAgeMessage] = useState(false);

  const languageOptions: ChoiceOption<Locale>[] = LOCALES.map((value) => ({
    value,
    label: LOCALE_NATIVE_NAME[value],
    lang: value,
    tone: "sky",
  }));

  const ageOptions: ChoiceOption<AgeGroup>[] = AGE_GROUPS.map((value, index) => ({
    value,
    // Left-to-right isolate keeps "10–12" in order inside Hebrew text.
    label: `\u2066${value.replace("-", "–")}\u2069`,
    hint: t.home.ageUnit,
    tone: AGE_TONES[index],
  }));

  function handleStart() {
    if (!ageGroup) {
      setShowAgeMessage(true);
      ageGroupRef.current?.querySelector("input")?.focus();
      return;
    }
    // A finished game has nothing left to keep: start the next one from a clean setup.
    if (state.status === "summary") reset();
    router.push("/quiz");
  }

  const savedGame = hasActiveGame && state.settings;
  const shownQuestion =
    state.selectedAnswerId === null ? state.completedCount + 1 : state.completedCount;

  return (
    <>
      <AppHeader />
      <main id="main" className={styles.main}>
        <section className={styles.hero}>
          <h1 className={styles.appName}>{t.meta.appName}</h1>
          <p className={styles.tagline}>{t.home.tagline}</p>
          <HomeIllustration className={styles.illustration} />
        </section>

        <div className={styles.card}>
          <ChoiceGroup
            legend={t.home.languageLabel}
            options={languageOptions}
            value={locale}
            onChange={setLocale}
          />
          <div className={styles.ageBlock}>
            <ChoiceGroup
              ref={ageGroupRef}
              legend={t.home.ageLabel}
              options={ageOptions}
              value={ageGroup}
              onChange={(value) => {
                setAgeGroup(value);
                setShowAgeMessage(false);
              }}
              describedBy={showAgeMessage ? "age-message" : undefined}
            />
            {savedGame && <p className={styles.hint}>{t.home.appliesNext}</p>}
            <p id="age-message" className={styles.message} role="status">
              {showAgeMessage ? t.home.chooseAgeFirst : ""}
            </p>
          </div>
        </div>

        {/* Waits for the saved game to be read, so "start" doesn't flip to "continue". */}
        <div className={styles.actions} aria-busy={!hydrated}>
          {hydrated &&
            (savedGame ? (
              <>
                <section className={styles.savedGame} aria-labelledby="saved-game-title">
                  <h2 id="saved-game-title" className={styles.savedGameTitle}>
                    {t.home.savedGameTitle}
                  </h2>
                  <p>
                    {format(t.home.savedGame, {
                      n: shownQuestion,
                      total: savedGame.questionLimit,
                    })}
                  </p>
                  <p>
                    {t.home.savedGameTopic} <bdi>{savedGame.topic}</bdi>
                  </p>
                </section>
                <ButtonLink href="/quiz">{t.home.continueGame}</ButtonLink>
                <Button variant="secondary" onClick={requestNewGame}>
                  {t.home.newGame}
                </Button>
              </>
            ) : (
              <Button onClick={handleStart}>{t.home.start}</Button>
            ))}
          <ButtonLink href="/about#how-to-play" variant="secondary">
            {t.home.howToPlay}
          </ButtonLink>
          <ButtonLink href="/about" variant="secondary">
            {t.home.about}
          </ButtonLink>
        </div>
        {dialog}
      </main>
    </>
  );
}
