"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Button } from "@/components/Button";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { SparkleIcon } from "@/components/icons";
import { format } from "@/i18n/getDictionary";
import { LOCALE_NATIVE_NAME } from "@/i18n/locales";
import type { AgeGroup } from "@/lib/ageGroups";
import { useGame } from "@/lib/game/GameProvider";
import {
  DIFFICULTIES,
  QUESTION_LIMITS,
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
  cleanTopic,
  type Difficulty,
  type QuestionLimit,
} from "@/lib/game/schemas";
import { usePreferences } from "@/lib/preferences";
import shared from "../shared.module.css";
import styles from "./page.module.css";
import { useTopicSuggestions } from "./useTopicSuggestions";

const DIFFICULTY_TONES = ["mint", "yellow", "pink"] as const;

type QuestionCount = `${QuestionLimit}`;
type TopicError = "missingTopic" | "UNSAFE_TOPIC" | "INVALID_INPUT";
type Errors = { difficulty?: boolean; count?: boolean; topic?: TopicError };

export function GameSetup({ ageGroup }: { ageGroup: AgeGroup }) {
  const { t, locale } = usePreferences();
  const { state, startGame } = useGame();
  const previous = state.settings;

  const [difficulty, setDifficulty] = useState<Difficulty | null>(previous?.difficulty ?? null);
  const [count, setCount] = useState<QuestionCount | null>(
    previous ? (String(previous.questionLimit) as QuestionCount) : null,
  );
  const [topic, setTopic] = useState(previous?.topic ?? "");
  const [errors, setErrors] = useState<Errors>(() =>
    state.setupError
      ? { topic: state.setupError === "UNSAFE_TOPIC" ? "UNSAFE_TOPIC" : "INVALID_INPUT" }
      : {},
  );
  const { suggestions, loadSuggestions } = useTopicSuggestions();

  const difficultyRef = useRef<HTMLFieldSetElement>(null);
  const countRef = useRef<HTMLFieldSetElement>(null);
  const topicRef = useRef<HTMLInputElement>(null);

  // Coming back because the topic was refused: put the child right on the topic field.
  useEffect(() => {
    if (state.setupError) topicRef.current?.focus();
    // Only on arrival at the setup screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const difficultyOptions: ChoiceOption<Difficulty>[] = DIFFICULTIES.map((value, index) => ({
    value,
    label: t.quiz.difficulties[value].label,
    hint: t.quiz.difficulties[value].hint,
    tone: DIFFICULTY_TONES[index],
  }));

  const countOptions: ChoiceOption<QuestionCount>[] = QUESTION_LIMITS.map((value) => ({
    value: `${value}`,
    label: format(t.quiz.countOption, { n: value }),
    tone: "sky",
  }));

  function chooseTopic(value: string) {
    setTopic(value);
    setErrors((current) => ({ ...current, topic: undefined }));
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const cleaned = cleanTopic(topic);
    const next: Errors = {
      difficulty: !difficulty,
      count: !count,
      topic: cleaned.length < TOPIC_MIN_LENGTH ? "missingTopic" : undefined,
    };
    setErrors(next);

    if (!difficulty) return difficultyRef.current?.querySelector("input")?.focus();
    if (!count) return countRef.current?.querySelector("input")?.focus();
    if (next.topic) return topicRef.current?.focus();

    startGame({ topic: cleaned, difficulty, questionLimit: Number(count) as QuestionLimit });
  }

  const suggestionsBusy = suggestions.status === "loading";

  return (
    <>
      <h1>{t.quiz.heading}</h1>

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

      <form className={styles.setupForm} onSubmit={onSubmit} noValidate>
        <div className={shared.card}>
          <div className={styles.group}>
            <ChoiceGroup
              ref={difficultyRef}
              legend={t.quiz.difficultyLabel}
              options={difficultyOptions}
              value={difficulty}
              onChange={(value) => {
                setDifficulty(value);
                setErrors((current) => ({ ...current, difficulty: false }));
              }}
              layout="column"
              describedBy={errors.difficulty ? "difficulty-error" : undefined}
            />
            {errors.difficulty && (
              <p id="difficulty-error" className={styles.fieldError}>
                {t.quiz.errors.missingDifficulty}
              </p>
            )}
          </div>

          <div className={styles.group}>
            <ChoiceGroup
              ref={countRef}
              legend={t.quiz.countLabel}
              options={countOptions}
              value={count}
              onChange={(value) => {
                setCount(value);
                setErrors((current) => ({ ...current, count: false }));
              }}
              describedBy={errors.count ? "count-error" : undefined}
            />
            {errors.count && (
              <p id="count-error" className={styles.fieldError}>
                {t.quiz.errors.missingCount}
              </p>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="topic" className={styles.fieldLabel}>
              {t.quiz.topicLabel}
            </label>
            <input
              ref={topicRef}
              id="topic"
              type="text"
              className={styles.input}
              placeholder={t.quiz.topicPlaceholder}
              value={topic}
              onChange={(event) => chooseTopic(event.target.value)}
              maxLength={TOPIC_MAX_LENGTH}
              autoComplete="off"
              aria-invalid={errors.topic ? true : undefined}
              aria-describedby={errors.topic ? "topic-error" : undefined}
            />
            {errors.topic && (
              <p id="topic-error" className={styles.fieldError}>
                {t.quiz.errors[errors.topic]}
              </p>
            )}

            <div className={styles.suggestions}>
              <Button
                variant="secondary"
                className={styles.suggestButton}
                onClick={() => loadSuggestions(locale, ageGroup)}
                disabled={suggestionsBusy}
                aria-describedby="suggestions-status"
              >
                <SparkleIcon size={20} />
                {suggestions.status === "done" ? t.quiz.suggestMore : t.quiz.suggestTopics}
              </Button>

              <div id="suggestions-status" role="status" className={styles.suggestionsStatus}>
                {suggestionsBusy && (
                  <span className={styles.inlineLoading}>
                    <span className={styles.spinnerSmall} aria-hidden="true" />
                    {t.quiz.loadingTopics}
                  </span>
                )}
                {suggestions.status === "error" && <span>{t.quiz.suggestionsError}</span>}
              </div>

              {suggestions.status === "done" && (
                <div className={styles.chipsBlock}>
                  <p id="suggestions-label" className={styles.chipsLabel}>
                    {t.quiz.suggestionsLabel}
                  </p>
                  <ul className={styles.chips} aria-labelledby="suggestions-label">
                    {suggestions.topics.map((suggestion) => (
                      <li key={suggestion}>
                        <button
                          type="button"
                          className={styles.chip}
                          aria-pressed={cleanTopic(topic) === suggestion}
                          onClick={() => chooseTopic(suggestion)}
                        >
                          {suggestion}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={shared.actions}>
          <Button type="submit">{t.quiz.startGame}</Button>
        </div>
      </form>
    </>
  );
}
