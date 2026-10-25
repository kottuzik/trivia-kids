"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGame } from "@/lib/game/GameProvider";
import { usePreferences } from "@/lib/preferences";
import { Button } from "./Button";
import styles from "./NewGameConfirm.module.css";

// Native modal <dialog>: the browser traps focus, closes on Escape and hides the page behind it.
function ConfirmDialog({
  open,
  title,
  text,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  text: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      // Start on the safe choice.
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby="confirm-title"
      aria-describedby="confirm-text"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
    >
      <h2 id="confirm-title" className={styles.title}>
        {title}
      </h2>
      <p id="confirm-text">{text}</p>
      <div className={styles.actions}>
        <Button ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant="secondary" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}

// "New game" asks first while a game is still in progress; a finished game is replaced directly.
export function useNewGameConfirm() {
  const { t } = usePreferences();
  const { hasActiveGame, reset } = useGame();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLElement | null>(null);

  const startFresh = useCallback(() => {
    reset();
    router.push("/quiz");
  }, [reset, router]);

  const requestNewGame = useCallback(() => {
    if (!hasActiveGame) return startFresh();
    openerRef.current = document.activeElement as HTMLElement | null;
    setOpen(true);
  }, [hasActiveGame, startFresh]);

  const dialog = (
    <ConfirmDialog
      open={open}
      title={t.confirmNewGame.title}
      text={t.confirmNewGame.text}
      confirmLabel={t.confirmNewGame.confirm}
      cancelLabel={t.confirmNewGame.cancel}
      onConfirm={() => {
        setOpen(false);
        startFresh();
      }}
      onCancel={() => {
        setOpen(false);
        openerRef.current?.focus();
      }}
    />
  );

  return { requestNewGame, dialog };
}
