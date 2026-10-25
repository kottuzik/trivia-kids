import "server-only";
import { randomUUID } from "node:crypto";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { fingerprint } from "@/lib/game/fingerprint";
import { ANSWER_IDS, type Question, type QuestionRequest } from "@/lib/game/schemas";
import { validateQuestion } from "@/lib/game/validateQuestion";
import { AppError, MODERATION_MODEL, TEXT_MODEL, hasRefusal, isFlagged, type AIClient } from "./openai";
import { questionPrompt } from "./prompts";

export const MAX_ATTEMPTS = 3;

const QuestionOutput = z.object({
  topicSuitable: z.boolean(),
  question: z.string(),
  answers: z.array(z.string()),
  correctIndex: z.number().int(),
  correctAnswerText: z.string(),
  explanation: z.string(),
});

function shuffle<T>(items: readonly T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function generateQuestion(request: QuestionRequest, ai: AIClient): Promise<Question> {
  const { topic, locale, ageGroup, difficulty, seenQuestionFingerprints } = request;

  // 1. Unsafe topics stop here, before any generation cost.
  const topicCheck = await ai.moderations.create({ model: MODERATION_MODEL, input: topic });
  if (topicCheck.results.some((item) => item.flagged)) throw new AppError("UNSAFE_TOPIC");

  const prompt = questionPrompt({ topic, locale, ageGroup, difficulty, asked: seenQuestionFingerprints });

  // 2. Generate, validate, and ask for a replacement when the content is not usable.
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const response = await ai.responses.parse({
      model: TEXT_MODEL,
      reasoning: { effort: "low" },
      max_output_tokens: 2500,
      instructions: prompt.instructions,
      input: prompt.input,
      text: { format: zodTextFormat(QuestionOutput, "trivia_question") },
      moderation: { model: MODERATION_MODEL },
    });

    if (hasRefusal(response.output)) throw new AppError("UNSAFE_TOPIC");

    const raw = response.output_parsed;
    if (!raw) {
      console.warn(`[questions] attempt ${attempt}: no parsable output (${response.status})`);
      continue;
    }
    if (!raw.topicSuitable) throw new AppError("UNSAFE_TOPIC");

    const issue = validateQuestion(raw, { locale, seenFingerprints: seenQuestionFingerprints });
    if (issue) {
      console.warn(`[questions] attempt ${attempt}: rejected (${issue})`);
      continue;
    }

    const shownText = [raw.question, ...raw.answers, raw.explanation].join("\n");
    if (await isFlagged(ai, response.moderation?.output, shownText)) {
      console.warn(`[questions] attempt ${attempt}: rejected (moderation)`);
      continue;
    }

    const correctText = raw.answers[raw.correctIndex].trim();
    const answers = shuffle(raw.answers.map((text) => text.trim())).map((text, index) => ({
      id: ANSWER_IDS[index],
      text,
    }));

    return {
      id: randomUUID(),
      text: raw.question.trim(),
      answers,
      correctAnswerId: answers.find((answer) => answer.text === correctText)!.id,
      explanation: raw.explanation.trim(),
      fingerprint: fingerprint(raw.question),
      topic,
      locale,
      ageGroup,
      difficulty,
    };
  }

  throw new AppError("AI_INVALID_RESPONSE");
}
