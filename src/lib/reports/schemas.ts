import { z } from "zod";
import { LOCALES } from "@/i18n/locales";
import { AGE_GROUPS } from "@/lib/ageGroups";
import { ANSWER_IDS, DIFFICULTIES, TEXT_LIMITS, TOPIC_MAX_LENGTH, cleanTopic } from "@/lib/game/schemas";

// Shared between the browser and the server: no secrets and no SDK imports here.

export const ISSUE_TYPES = ["not_for_kids", "wrong_answer", "off_topic", "confusing", "other"] as const;
export type IssueType = (typeof ISSUE_TYPES)[number];

// Same cleaning as the topic field: no control characters, single spaces.
function text(max: number) {
  return z
    .string()
    .max(max * 2)
    .transform(cleanTopic)
    .pipe(z.string().min(1).max(max));
}

const ReportedQuestionSchema = z.strictObject({
  id: z.uuid(),
  text: text(TEXT_LIMITS.question),
  answers: z
    .array(z.strictObject({ id: z.enum(ANSWER_IDS), text: text(TEXT_LIMITS.answer) }))
    .length(ANSWER_IDS.length)
    .refine((answers) => answers.every((answer, index) => answer.id === ANSWER_IDS[index]), {
      message: "answers must be a, b, c, d in order",
    }),
  correctAnswerId: z.enum(ANSWER_IDS),
  explanation: text(TEXT_LIMITS.explanation),
  topic: text(TOPIC_MAX_LENGTH),
  locale: z.enum(LOCALES),
  ageGroup: z.enum(AGE_GROUPS),
  difficulty: z.enum(DIFFICULTIES),
});

export const ReportRequestSchema = z.strictObject({
  issueType: z.enum(ISSUE_TYPES),
  question: ReportedQuestionSchema,
});
export type ReportRequest = z.infer<typeof ReportRequestSchema>;
