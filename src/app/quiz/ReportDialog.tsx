"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ChoiceGroup } from "@/components/ChoiceGroup";
import { CheckIcon, CloseIcon, RetryIcon } from "@/components/icons";
import dialogStyles from "@/components/NewGameConfirm.module.css";
import { toClientErrorCode } from "@/lib/game/api";
import type { ClientErrorCode, Question } from "@/lib/game/schemas";
import { usePreferences } from "@/lib/preferences";
import { sendReport } from "@/lib/reports/api";
import { ISSUE_TYPES, type IssueType } from "@/lib/reports/schemas";
import styles from "./ReportDialog.module.css";

type Status =
  | { state: "idle" }
  | { state: "sending" }
  | { state: "sent" }
  | { state: "failed"; code: ClientErrorCode };

// Reporting never touches the game state: score, answer and progress stay exactly as they were.
export function ReportDialog({
  question,
  open,
  onClose,
  onSent,
}: {
  question: Question;
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}) {
  const { t } = usePreferences();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);
  const [issueType, setIssueType] = useState<IssueType | null>(null);
  const [missingIssue, setMissingIssue] = useState(false);
  const [status, setStatus] = useState<Status>({ state: "idle" });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (status.state === "sent" || status.state === "failed") resultRef.current?.focus();
  }, [status]);

  async function submit() {
    if (status.state === "sending") return;
    if (!issueType) {
      setMissingIssue(true);
      return;
    }
    setStatus({ state: "sending" });
    try {
      await sendReport(question, issueType);
      setStatus({ state: "sent" });
      onSent();
    } catch (error) {
      setStatus({ state: "failed", code: toClientErrorCode(error) });
    }
  }

  const sending = status.state === "sending";
  const errors = t.quiz.report.errors;
  const errorText =
    status.state === "failed"
      ? status.code in errors
        ? errors[status.code as keyof typeof errors]
        : errors.other
      : "";

  return (
    <dialog
      ref={dialogRef}
      className={`${dialogStyles.dialog} ${styles.dialog}`}
      aria-labelledby="report-title"
      aria-describedby="report-intro"
      onCancel={(event) => {
        event.preventDefault();
        if (!sending) onClose();
      }}
    >
      <h2 id="report-title" className={dialogStyles.title}>
        {t.quiz.report.title}
      </h2>

      {status.state === "sent" ? (
        <>
          <p ref={resultRef} tabIndex={-1} role="status" className={`${styles.result} ${styles.success}`}>
            <CheckIcon size={24} />
            <span>{t.quiz.report.sent}</span>
          </p>
          <p id="report-intro">{t.quiz.report.sentHint}</p>
          <div className={dialogStyles.actions}>
            <Button onClick={onClose}>{t.quiz.report.backToGame}</Button>
          </div>
        </>
      ) : (
        <>
          <p id="report-intro">{t.quiz.report.intro}</p>
          <ChoiceGroup
            legend={t.quiz.report.legend}
            layout="column"
            value={issueType}
            onChange={(value) => {
              setIssueType(value);
              setMissingIssue(false);
            }}
            options={ISSUE_TYPES.map((value) => ({ value, label: t.quiz.report.issues[value] }))}
            describedBy="report-issue-error"
          />
          <p id="report-issue-error" role="alert" className={styles.fieldError}>
            {missingIssue ? t.quiz.report.chooseIssue : ""}
          </p>

          {status.state === "failed" && (
            <p ref={resultRef} tabIndex={-1} role="alert" className={`${styles.result} ${styles.failure}`}>
              <CloseIcon size={24} />
              <span>{errorText}</span>
            </p>
          )}
          <p role="status" className={styles.sending}>
            {sending ? t.quiz.report.sending : ""}
          </p>

          <div className={dialogStyles.actions}>
            <Button onClick={submit} aria-disabled={sending ? true : undefined} className={styles.send}>
              {status.state === "failed" && <RetryIcon size={20} />}
              {status.state === "failed" ? t.quiz.report.tryAgain : t.quiz.report.send}
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={sending}>
              {t.quiz.report.backToGame}
            </Button>
          </div>
        </>
      )}
    </dialog>
  );
}
