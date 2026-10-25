"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { ChoiceGroup, type ChoiceOption } from "@/components/ChoiceGroup";
import { SettingsIcon, SparkleIcon } from "@/components/icons";
import { LOCALES, LOCALE_NATIVE_NAME, type Locale } from "@/i18n/locales";
import { AGE_GROUPS, type AgeGroup } from "@/lib/ageGroups";
import { useGame } from "@/lib/game/GameProvider";
import {
  DIFFICULTIES,
  TOPIC_MAX_LENGTH,
  TOPIC_MIN_LENGTH,
  cleanTopic,
  type Difficulty,
} from "@/lib/game/schemas";
import { usePreferences } from "@/lib/preferences";
import styles from "./page.module.css";
import { useTopicSuggestions } from "./useTopicSuggestions";

const TONES = ["mint", "yellow", "pink"] as const;

// Changes language, age group, difficulty and topic in the middle of a game.
// Nothing here touches the shown question: the new values are used from the next request.
export function GameSettingsPanel({ focusTopic = false }: { focusTopic?: boolean }) {
  const { t, locale, ageGroup, setLocale, setAgeGroup } = usePreferences();
  const { state, updateSettings } = useGame();
  const settings = state.settings;

  const [open, setOpen] = useState(focusTopic);
  const [saved, setSaved] = useState(false);
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);

  return (
    <section className={styles.settingsPanel} aria-label={t.quiz.settingsTitle}>
      <button
        ref={toggleRef}
        type="button"
        className={styles.settingsToggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen((value) => !value);
          setSaved(false);
        }}
      >
        <SettingsIcon size={22} />
        {t.quiz.settingsButton}
      </button>

      <p role="status" className={styles.settingsSaved}>
        {saved ? t.quiz.settingsSaved : ""}
      </p>

      {open && settings && ageGroup && (
        <SettingsForm
          id={panelId}
          focusTopic={focusTopic}
          initial={{ locale, ageGroup, difficulty: settings.difficulty, topic: settings.topic }}
          onSave={(next) => {
            if (next.locale !== locale) setLocale(next.locale);
            if (next.ageGroup !== ageGroup) setAgeGroup(next.ageGroup);
            updateSettings({ topic: next.topic, difficulty: next.difficulty });
            setOpen(false);
            setSaved(true);
            toggleRef.current?.focus();
          }}
        />
      )}
    </section>
  );
}

type Draft = { locale: Locale; ageGroup: AgeGroup; difficulty: Difficulty; topic: string };

function SettingsForm({
  id,
  initial,
  focusTopic,
  onSave,
}: {
  id: string;
  initial: Draft;
  focusTopic: boolean;
  onSave: (draft: Draft) => void;
}) {
  const { t } = usePreferences();
  const [draft, setDraft] = useState(initial);
  const [topicError, setTopicError] = useState(false);
  const { suggestions, loadSuggestions } = useTopicSuggestions();
  const topicRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (focusTopic) topicRef.current?.focus();
    // Only when the panel opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (patch: Partial<Draft>) => setDraft((current) => ({ ...current, ...patch }));

  const languageOptions: ChoiceOption<Locale>[] = LOCALES.map((value) => ({
    value,
    label: LOCALE_NATIVE_NAME[value],
    lang: value,
    tone: "sky",
  }));
  const ageOptions: ChoiceOption<AgeGroup>[] = AGE_GROUPS.map((value, index) => ({
    value,
    label: t.home.ageGroups[value],
    tone: TONES[index],
  }));
  const difficultyOptions: ChoiceOption<Difficulty>[] = DIFFICULTIES.map((value, index) => ({
    value,
    label: t.quiz.difficulties[value].label,
    tone: TONES[index],
  }));

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const topic = cleanTopic(draft.topic);
    if (topic.length < TOPIC_MIN_LENGTH) {
      setTopicError(true);
      topicRef.current?.focus();
      return;
    }
    onSave({ ...draft, topic });
  }

  return (
    <form id={id} className={styles.settingsForm} onSubmit={onSubmit} noValidate>
      <p className={styles.settingsHint}>{t.quiz.settingsHint}</p>

      <ChoiceGroup
        legend={t.quiz.languageLabel}
        options={languageOptions}
        value={draft.locale}
        onChange={(value) => update({ locale: value })}
      />
      <ChoiceGroup
        legend={t.quiz.ageLabel}
        options={ageOptions}
        value={draft.ageGroup}
        onChange={(value) => update({ ageGroup: value })}
      />
      <ChoiceGroup
        legend={t.quiz.difficultyLabel}
        options={difficultyOptions}
        value={draft.difficulty}
        onChange={(value) => update({ difficulty: value })}
      />

      <div className={styles.field}>
        <label htmlFor={`${id}-topic`} className={styles.fieldLabel}>
          {t.quiz.topicLabel}
        </label>
        <input
          ref={topicRef}
          id={`${id}-topic`}
          type="text"
          className={styles.input}
          placeholder={t.quiz.topicPlaceholder}
          value={draft.topic}
          onChange={(event) => {
            update({ topic: event.target.value });
            setTopicError(false);
          }}
          maxLength={TOPIC_MAX_LENGTH}
          autoComplete="off"
          aria-invalid={topicError ? true : undefined}
          aria-describedby={topicError ? `${id}-topic-error` : undefined}
        />
        {topicError && (
          <p id={`${id}-topic-error`} className={styles.fieldError}>
            {t.quiz.errors.missingTopic}
          </p>
        )}

        <div className={styles.suggestions}>
          <Button
            variant="secondary"
            className={styles.suggestButton}
            onClick={() => loadSuggestions(draft.locale, draft.ageGroup)}
            disabled={suggestions.status === "loading"}
            aria-describedby={`${id}-suggestions-status`}
          >
            <SparkleIcon size={20} />
            {suggestions.status === "done" ? t.quiz.suggestMore : t.quiz.suggestTopics}
          </Button>
          <div id={`${id}-suggestions-status`} role="status" className={styles.suggestionsStatus}>
            {suggestions.status === "loading" && (
              <span className={styles.inlineLoading}>
                <span className={styles.spinnerSmall} aria-hidden="true" />
                {t.quiz.loadingTopics}
              </span>
            )}
            {suggestions.status === "error" && <span>{t.quiz.suggestionsError}</span>}
          </div>
          {suggestions.status === "done" && (
            <ul className={styles.chips} aria-label={t.quiz.suggestionsLabel}>
              {suggestions.topics.map((suggestion) => (
                <li key={suggestion}>
                  <button
                    type="button"
                    className={styles.chip}
                    aria-pressed={cleanTopic(draft.topic) === suggestion}
                    onClick={() => {
                      update({ topic: suggestion });
                      setTopicError(false);
                    }}
                  >
                    {suggestion}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Button type="submit">{t.quiz.saveSettings}</Button>
    </form>
  );
}
