"use client";

import { Button } from "@/components/Button";
import { useNewGameConfirm } from "@/components/NewGameConfirm";
import { RetryIcon } from "@/components/icons";
import type { ClientErrorCode } from "@/lib/game/schemas";
import { usePreferences } from "@/lib/preferences";
import { useFocusOnMount } from "@/lib/useFocusOnMount";
import shared from "../shared.module.css";
import { GameSettingsPanel } from "./GameSettingsPanel";
import styles from "./page.module.css";

// Focus moves to the heading, so screen readers announce the new state right away.
export function LoadingPanel({ title }: { title?: string }) {
  const { t } = usePreferences();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <section className={styles.statusPanel} aria-busy="true">
      <span className={styles.spinner} aria-hidden="true" />
      <h1 ref={headingRef} tabIndex={-1} className={styles.statusTitle}>
        {title ?? t.quiz.loadingQuestion}
      </h1>
      <p className={shared.secondaryText}>{t.quiz.loadingHint}</p>
    </section>
  );
}

export function ErrorPanel({ code, onRetry }: { code: ClientErrorCode; onRetry: () => void }) {
  const { t } = usePreferences();
  const { requestNewGame, dialog } = useNewGameConfirm();
  const headingRef = useFocusOnMount<HTMLHeadingElement>();

  return (
    <>
      <section className={`${styles.statusPanel} ${styles.errorPanel}`} aria-labelledby="error-title">
        <h1 id="error-title" ref={headingRef} tabIndex={-1} className={styles.statusTitle}>
          {t.quiz.errorTitle}
        </h1>
        <p>{t.quiz.apiErrors[code]}</p>
      </section>
      <div className={shared.actions}>
        <Button onClick={onRetry}>
          <RetryIcon size={20} />
          {t.quiz.tryAgain}
        </Button>
        <Button variant="secondary" onClick={requestNewGame}>
          {t.quiz.newGame}
        </Button>
      </div>
      {/* An unsuitable topic mid-game: offer to pick another one right here. */}
      <GameSettingsPanel key={code} focusTopic={code === "UNSAFE_TOPIC"} />
      {dialog}
    </>
  );
}
