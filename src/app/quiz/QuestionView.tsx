"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { Button } from "@/components/Button";
import { CheckIcon, CloseIcon } from "@/components/icons";
import { format, getDictionary } from "@/i18n/getDictionary";
import { LOCALE_DIR } from "@/i18n/locales";
import { isLastQuestion } from "@/lib/game/engine";
import { useGame } from "@/lib/game/GameProvider";
import type { Question } from "@/lib/game/schemas";
import { usePreferences } from "@/lib/preferences";
import { useFocusOnMount } from "@/lib/useFocusOnMount";
import styles from "./page.module.css";

export function QuestionView({ question }: { question: Question }) {
  const { t, locale } = usePreferences();
  const { state, answer, next } = useGame();
  const selected = state.selectedAnswerId;
  const answered = selected !== null;
  const isCorrect = selected === question.correctAnswerId;
  const correctAnswer = question.answers.find((item) => item.id === question.correctAnswerId)!;
  // Letters follow the question's own language (it may differ from the UI after a change).
  const letters = getDictionary(question.locale).quiz.answerLetters;
  const questionDir = LOCALE_DIR[question.locale];

  const questionRef = useFocusOnMount<HTMLHeadingElement>();
  const feedbackRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (answered) feedbackRef.current?.focus();
  }, [answered]);

  const total = state.settings?.questionLimit ?? 0;
  const number = answered ? state.completedCount : state.completedCount + 1;

  return (
    <>
      <div className={styles.progressRow}>
        <h1 className={styles.progress}>{format(t.quiz.progress, { n: number, total })}</h1>
        <p className={styles.topicTag}>{format(t.quiz.topicTag, { topic: question.topic })}</p>
      </div>
      <div
        className={styles.progressBar}
        aria-hidden="true"
        style={{ "--progress": `${(state.completedCount / Math.max(total, 1)) * 100}%` } as CSSProperties}
      />

      <section className={styles.questionCard} lang={question.locale} dir={questionDir}>
        <h2 ref={questionRef} tabIndex={-1} className={styles.questionText}>
          {question.text}
        </h2>

        <ul className={styles.answers} aria-label={t.quiz.answersLabel} lang={locale}>
          {question.answers.map((item, index) => {
            const isThisCorrect = answered && item.id === question.correctAnswerId;
            const isThisWrongChoice = answered && item.id === selected && !isCorrect;
            const stateClass = isThisCorrect
              ? styles.answerCorrect
              : isThisWrongChoice
                ? styles.answerWrong
                : "";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`${styles.answer} ${stateClass}`}
                  disabled={answered}
                  onClick={() => answer(item.id)}
                >
                  <span className={styles.answerLetter} aria-hidden="true">
                    {letters[index]}
                  </span>
                  <span className={styles.answerText} lang={question.locale} dir={questionDir}>
                    {item.text}
                  </span>
                  {isThisCorrect && (
                    <span className={`${styles.answerTag} ${styles.tagCorrect}`}>
                      <CheckIcon size={18} />
                      {t.quiz.correctAnswer}
                    </span>
                  )}
                  {isThisWrongChoice && (
                    <span className={`${styles.answerTag} ${styles.tagWrong}`}>
                      <CloseIcon size={18} />
                      {t.quiz.yourAnswer}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {answered && (
        <>
          <section
            className={`${styles.feedback} ${isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}`}
            aria-labelledby="feedback-title"
          >
            <div className={styles.feedbackHead}>
              <span className={styles.feedbackIcon} aria-hidden="true">
                {isCorrect ? <CheckIcon size={28} /> : <CloseIcon size={28} />}
              </span>
              <h2 id="feedback-title" ref={feedbackRef} tabIndex={-1}>
                {isCorrect ? t.quiz.correct : t.quiz.incorrect}
              </h2>
            </div>
            {!isCorrect && (
              <p className={styles.correctLine}>
                {format(t.quiz.correctAnswerIs, { answer: "" })}
                <bdi lang={question.locale}>{correctAnswer.text}</bdi>
              </p>
            )}
            <h3 className={styles.explanationTitle}>{t.quiz.explanationTitle}</h3>
            <p lang={question.locale} dir={questionDir}>
              {question.explanation}
            </p>
          </section>

          <Button onClick={next}>{isLastQuestion(state) ? t.quiz.toSummary : t.quiz.next}</Button>
        </>
      )}
    </>
  );
}
