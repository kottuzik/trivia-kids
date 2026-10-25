import "server-only";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import { cleanTopic, type TopicsRequest } from "@/lib/game/schemas";
import { AppError, MODERATION_MODEL, TEXT_MODEL, isFlagged, type AIClient } from "./openai";
import { topicsPrompt } from "./prompts";

const TopicsOutput = z.object({ topics: z.array(z.string()) });

const MAX_TOPICS = 6;
const MIN_TOPICS = 3;

export async function suggestTopics({ locale, ageGroup }: TopicsRequest, ai: AIClient) {
  const prompt = topicsPrompt(locale, ageGroup);
  const response = await ai.responses.parse({
    model: TEXT_MODEL,
    reasoning: { effort: "low" },
    max_output_tokens: 1500,
    instructions: prompt.instructions,
    input: prompt.input,
    text: { format: zodTextFormat(TopicsOutput, "topic_suggestions") },
    moderation: { model: MODERATION_MODEL },
  });

  const parsed = response.output_parsed;
  if (!parsed) throw new AppError("AI_INVALID_RESPONSE");

  const seen = new Set<string>();
  const topics = parsed.topics
    .map(cleanTopic)
    .filter((topic) => topic.length >= 2 && topic.length <= 40)
    .filter((topic) => {
      const key = topic.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, MAX_TOPICS);

  if (topics.length < MIN_TOPICS) throw new AppError("AI_INVALID_RESPONSE");
  if (await isFlagged(ai, response.moderation?.output, topics.join("\n"))) {
    throw new AppError("AI_INVALID_RESPONSE");
  }
  return topics;
}
