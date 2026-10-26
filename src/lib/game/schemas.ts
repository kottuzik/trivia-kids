import { z } from "zod";
import { LOCALES, type Locale } from "@/i18n/locales";
import { AGE_GROUPS, type AgeGroup } from "@/lib/ageGroups";

// Shared between the browser and the server: no secrets and no SDK imports here.

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const QUESTION_LIMITS = [5, 10, 15] as const;
export type QuestionLimit = (typeof QUESTION_LIMITS)[number];

export const TOPIC_MIN_LENGTH = 2;
export const TOPIC_MAX_LENGTH = 60;
export const MAX_SEEN_FINGERPRINTS = 30;
export const FINGERPRINT_MAX_LENGTH = 200;
// Longest accepted question parts (checked on generation and again on reports).
export const TEXT_LIMITS = { question: 300, answer: 120, explanation: 600 };

export const ANSWER_IDS = ["a", "b", "c", "d"] as const;
export type AnswerId = (typeof ANSWER_IDS)[number];

export const API_ERROR_CODES = [
  "INVALID_INPUT",
  "UNSAFE_TOPIC",
  "AI_UNAVAILABLE",
  "AI_INVALID_RESPONSE",
  "RATE_LIMITED",
  "REPORT_SAVE_FAILED",
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];
// NETWORK is detected in the browser only (request never reached the server).
export type ClientErrorCode = ApiErrorCode | "NETWORK";

export function isApiErrorCode(value: unknown): value is ApiErrorCode {
  return typeof value === "string" && (API_ERROR_CODES as readonly string[]).includes(value);
}

// Removes control characters and repeated whitespace from free text typed by the child.
export function cleanTopic(raw: string) {
  return raw
    .replace(/[\p{Cc}\p{Cf}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const topicSchema = z
  .string()
  .max(TOPIC_MAX_LENGTH * 2)
  .transform(cleanTopic)
  .pipe(z.string().min(TOPIC_MIN_LENGTH).max(TOPIC_MAX_LENGTH));

export const TopicsRequestSchema = z.strictObject({
  locale: z.enum(LOCALES),
  ageGroup: z.enum(AGE_GROUPS),
});
export type TopicsRequest = z.infer<typeof TopicsRequestSchema>;

export const QuestionRequestSchema = z.strictObject({
  topic: topicSchema,
  locale: z.enum(LOCALES),
  ageGroup: z.enum(AGE_GROUPS),
  difficulty: z.enum(DIFFICULTIES),
  seenQuestionFingerprints: z
    .array(z.string().max(FINGERPRINT_MAX_LENGTH))
    .max(MAX_SEEN_FINGERPRINTS),
});
export type QuestionRequest = z.infer<typeof QuestionRequestSchema>;

export type Answer = { id: AnswerId; text: string };

// A validated question as the browser receives it. It carries the correct answer and the
// explanation so the child can still answer if the connection drops after it loaded.
export type Question = {
  id: string;
  text: string;
  answers: Answer[];
  correctAnswerId: AnswerId;
  explanation: string;
  fingerprint: string;
  topic: string;
  locale: Locale;
  ageGroup: AgeGroup;
  difficulty: Difficulty;
};
