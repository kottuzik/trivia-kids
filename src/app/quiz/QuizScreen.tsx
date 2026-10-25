"use client";

import { useState } from "react";
import Link from "next/link";
import { AppHeader } from "@/components/AppHeader";
import { Button, ButtonLink } from "@/components/Button";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { format } from "@/i18n/getDictionary";
import { LOCALE_NATIVE_NAME } from "@/i18n/locales";
import { usePreferences } from "@/lib/preferences";
import shared from "../shared.module.css";
import styles from "./page.module.css";

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
type Difficulty = (typeof DIFFICULTIES)[number];
const DIFFICULTY_TONES = ["mint", "yellow", "pink"] as const;

const QUESTION_COUNTS = ["5", "10", "15"] as const;
type QuestionCount = (typeof QUESTION_COUNTS)[number];

export function QuizScreen() {
  const { t, locale, ageGroup } = usePreferences();
  // Local-only setup state for now; it is wired to the game in Milestone 2.
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const [count, setCount] = useState<QuestionCount | null>(null);
  const [topic, setTopic] = useState("");

  const difficultyOptions: ChoiceOption<Difficulty>[] = DIFFICULTIES.map((value, index) => ({
    value,
    label: t.quiz.difficulties[value].label,
    hint: t.quiz.difficulties[value].hint,
    tone: DIFFICULTY_TONES[index],
  }));

  const countOptions: ChoiceOption<QuestionCount>[] = QUESTION_COUNTS.map((value) => ({
    value,
    label: format(t.quiz.countOption, { n: value }),
    tone: "sky",
  }));

  return (
    <>
      <AppHeader showBack />
      <main id="main" className={shared.main}>
        <h1>{t.quiz.heading}</h1>

        {!ageGroup ? (
          <section className={shared.card} aria-labelledby="no-age-title">
            <h2 id="no-age-title" className={styles.cardTitle}>
              {t.quiz.noAgeTitle}
            </h2>
            <p>{t.quiz.noAgeText}</p>
            <ButtonLink href="/">{t.quiz.goHome}</ButtonLink>
          </section>
        ) : (
          <>
            <section className={styles.summary} aria-labelledby="choices-title">
              <h2 id="choices-title" className={styles.cardTitle}>
                {t.quiz.yourChoices}
              </h2>
              <dl className={styles.summaryList}>
                <div>
                  <dt>{t.quiz.languageLabel}</dt>
                  <dd lang={locale}>{LOCALE_NATIVE_NAME[locale]}</dd>
                </div>
                <div>
                  <dt>{t.quiz.ageLabel}</dt>
                  <dd>{t.home.ageGroups[ageGroup]}</dd>
                </div>
              </dl>
              <Link href="/" className={styles.changeLink}>
                {t.quiz.change}
              </Link>
            </section>

            <div className={shared.card}>
              <ChoiceGroup
                legend={t.quiz.difficultyLabel}
                options={difficultyOptions}
                value={difficulty}
                onChange={setDifficulty}
                layout="column"
              />
              <ChoiceGroup
                legend={t.quiz.countLabel}
                options={countOptions}
                value={count}
                onChange={setCount}
              />
              <div className={styles.field}>
                <label htmlFor="topic" className={styles.fieldLabel}>
                  {t.quiz.topicLabel}
                </label>
                <input
                  id="topic"
                  type="text"
                  className={styles.input}
                  placeholder={t.quiz.topicPlaceholder}
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  maxLength={60}
                  autoComplete="off"
                />
              </div>
            </div>

            <div className={shared.actions}>
              <Button disabled aria-describedby="coming-soon">
                {t.quiz.startGame}
              </Button>
              <p id="coming-soon" className={styles.note}>
                {t.quiz.comingSoon}
              </p>
            </div>
          </>
        )}
      </main>
    </>
  );
}
