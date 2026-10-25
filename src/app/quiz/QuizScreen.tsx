"use client";

import { AppHeader } from "@/components/AppHeader";
import { ButtonLink } from "@/components/Button";
import { useGame } from "@/lib/game/GameProvider";
import { usePreferences } from "@/lib/preferences";
import shared from "../shared.module.css";
import { GameSetup } from "./GameSetup";
import { GameSummary } from "./GameSummary";
import { QuestionView } from "./QuestionView";
import { ErrorPanel, LoadingPanel } from "./StatusPanel";
import styles from "./page.module.css";

// One screen, several states: setup → (loading / question / error)* → summary.
export function QuizScreen() {
  const { t, ageGroup } = usePreferences();
  const { state, hydrated, retry } = useGame();

  let content;
  if (!hydrated) {
    content = <LoadingPanel title={t.quiz.loadingGame} />;
  } else if (state.status === "summary") {
    content = <GameSummary />;
  } else if (state.status === "playing") {
    if (state.request.state === "error") {
      content = <ErrorPanel code={state.request.code} onRetry={retry} />;
    } else if (state.currentQuestion) {
      // Keyed so focus and feedback start fresh for every question.
      content = <QuestionView key={state.currentQuestion.id} question={state.currentQuestion} />;
    } else {
      content = <LoadingPanel />;
    }
  } else if (!ageGroup) {
    content = (
      <>
        <h1>{t.quiz.heading}</h1>
        <section className={shared.card} aria-labelledby="no-age-title">
          <h2 id="no-age-title" className={styles.cardTitle}>
            {t.quiz.noAgeTitle}
          </h2>
          <p>{t.quiz.noAgeText}</p>
          <ButtonLink href="/">{t.quiz.goHome}</ButtonLink>
        </section>
      </>
    );
  } else {
    content = <GameSetup key={state.gameId} ageGroup={ageGroup} />;
  }

  return (
    <>
      <AppHeader showBack />
      <main id="main" className={shared.main}>
        {content}
      </main>
    </>
  );
}
