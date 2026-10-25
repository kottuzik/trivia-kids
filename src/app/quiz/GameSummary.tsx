"use client";

import { Button, ButtonLink } from "@/components/Button";
import { TrophyIcon } from "@/components/icons";
import { format } from "@/i18n/getDictionary";
import { LOCALE_DIR } from "@/i18n/locales";
import { successRate } from "@/lib/game/engine";
import { useGame } from "@/lib/game/GameProvider";
import { usePreferences } from "@/lib/preferences";
import { useFocusOnMount } from "@/lib/useFocusOnMount";
import shared from "../shared.module.css";
import styles from "./page.module.css";

export function GameSummary() {
  const { t } = usePreferences();
  const { state, reset } = useGame();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();
  const total = state.settings?.questionLimit ?? 0;
  const mistakes = state.answeredQuestions.filter((item) => !item.isCorrect);

  return (
    <>
      <section className={styles.summaryHero}>
        <span className={styles.trophy} aria-hidden="true">
          <TrophyIcon size={56} />
        </span>
        <h1 ref={headingRef} tabIndex={-1}>
          {t.summary.title}
        </h1>
        <p>{t.summary.subtitle}</p>
      </section>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dt>{t.summary.correctLabel}</dt>
          <dd>{format(t.summary.correctValue, { correct: state.correctCount, total })}</dd>
        </div>
        <div className={styles.stat}>
          <dt>{t.summary.rateLabel}</dt>
          <dd>{format(t.summary.rateValue, { rate: successRate(state) })}</dd>
        </div>
      </dl>

      <section className={shared.card} aria-labelledby="mistakes-title">
        <h2 id="mistakes-title" className={styles.cardTitle}>
          {t.summary.mistakesTitle}
        </h2>
        {mistakes.length === 0 ? (
          <p>{t.summary.noMistakes}</p>
        ) : (
          <ol className={styles.mistakes}>
            {mistakes.map(({ question, selectedAnswerId }) => {
              const chosen = question.answers.find((item) => item.id === selectedAnswerId);
              const correct = question.answers.find((item) => item.id === question.correctAnswerId);
              const contentProps = { lang: question.locale, dir: LOCALE_DIR[question.locale] };
              return (
                <li key={question.id} className={styles.mistake}>
                  <p className={styles.mistakeQuestion} {...contentProps}>
                    {question.text}
                  </p>
                  <p className={styles.mistakeWrong}>
                    {t.summary.yourAnswer} <bdi {...contentProps}>{chosen?.text}</bdi>
                  </p>
                  <p className={styles.mistakeRight}>
                    {t.summary.correctAnswer} <bdi {...contentProps}>{correct?.text}</bdi>
                  </p>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <div className={shared.actions}>
        <Button onClick={reset}>{t.summary.newGame}</Button>
        <ButtonLink href="/" variant="secondary" onClick={reset}>
          {t.summary.home}
        </ButtonLink>
      </div>
    </>
  );
}
