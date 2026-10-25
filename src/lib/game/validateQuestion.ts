import type { Locale } from "@/i18n/locales";
import { fingerprint } from "./fingerprint";

// The structured output we ask the model for (before shuffling and ids are added).
export type RawQuestion = {
  topicSuitable: boolean;
  question: string;
  answers: string[];
  correctIndex: number;
  correctAnswerText: string;
  explanation: string;
};

export type ValidationIssue =
  | "empty_field"
  | "too_long"
  | "answer_count"
  | "duplicate_answers"
  | "correct_mismatch"
  | "already_seen"
  | "wrong_language";

const LIMITS = { question: 300, answer: 120, explanation: 600 };

const SCRIPT: Record<Locale, RegExp> = {
  he: /\p{Script=Hebrew}/u,
  ru: /\p{Script=Cyrillic}/u,
  en: /\p{Script=Latin}/u,
};

// True when at least half of the letters belong to the expected script, so a Hebrew
// question may still mention "DNA" or "NASA".
export function isMostlyInLanguage(text: string, locale: Locale) {
  const letters = [...text].filter((char) => /\p{L}/u.test(char));
  if (letters.length === 0) return false;
  const matching = letters.filter((char) => SCRIPT[locale].test(char)).length;
  return matching / letters.length >= 0.5;
}

function normalizeAnswer(text: string) {
  return fingerprint(text) || text.trim();
}

// Structural and content checks before a question may be shown. Returns the first issue found.
export function validateQuestion(
  raw: RawQuestion,
  { locale, seenFingerprints }: { locale: Locale; seenFingerprints: readonly string[] },
): ValidationIssue | null {
  const question = raw.question.trim();
  const explanation = raw.explanation.trim();
  const answers = raw.answers.map((answer) => answer.trim());

  if (raw.answers.length !== 4) return "answer_count";
  if (!question || !explanation || answers.some((answer) => !answer)) return "empty_field";
  if (
    question.length > LIMITS.question ||
    explanation.length > LIMITS.explanation ||
    answers.some((answer) => answer.length > LIMITS.answer)
  ) {
    return "too_long";
  }

  const normalized = answers.map(normalizeAnswer);
  if (new Set(normalized).size !== 4) return "duplicate_answers";

  if (!Number.isInteger(raw.correctIndex) || raw.correctIndex < 0 || raw.correctIndex > 3) {
    return "correct_mismatch";
  }
  if (normalized[raw.correctIndex] !== normalizeAnswer(raw.correctAnswerText)) {
    return "correct_mismatch";
  }

  if (seenFingerprints.includes(fingerprint(question))) return "already_seen";

  if (!isMostlyInLanguage(question, locale) || !isMostlyInLanguage(explanation, locale)) {
    return "wrong_language";
  }

  return null;
}
