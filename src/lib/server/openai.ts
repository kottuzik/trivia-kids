import "server-only";
import OpenAI from "openai";
import type { ApiErrorCode } from "@/lib/game/schemas";

// Cheapest current model with Structured Outputs (see ADR-2 in ARCHITECTURE.md).
export const TEXT_MODEL = "gpt-6-luna";
export const MODERATION_MODEL = "omni-moderation-latest";

// The minimal surface we use, so tests can pass a fake client.
export type AIClient = Pick<OpenAI, "responses" | "moderations">;

export class AppError extends Error {
  constructor(public readonly code: ApiErrorCode) {
    super(code);
  }
}

let client: OpenAI | null = null;

export function getOpenAI(): AIClient {
  if (!process.env.OPENAI_API_KEY) {
    console.error("[ai] OPENAI_API_KEY is not set");
    throw new AppError("AI_UNAVAILABLE");
  }
  client ??= new OpenAI({ timeout: 25_000, maxRetries: 1 });
  return client;
}

// Maps any failure to an error code safe to show the browser. Never logs prompts or content.
export function toErrorCode(error: unknown): ApiErrorCode {
  if (error instanceof AppError) return error.code;
  if (error instanceof OpenAI.RateLimitError) {
    console.error("[ai] OpenAI rate limit or quota reached");
    return "RATE_LIMITED";
  }
  if (error instanceof OpenAI.APIError) {
    console.error(`[ai] OpenAI request failed: status=${error.status ?? "none"} type=${error.name}`);
  } else {
    console.error(`[ai] Unexpected failure: ${error instanceof Error ? error.name : "unknown"}`);
  }
  return "AI_UNAVAILABLE";
}

type InlineModeration = { type: string; flagged?: boolean } | null | undefined;

// Uses the moderation result returned with the response; falls back to the Moderation API
// when the inline result is missing or errored.
export async function isFlagged(ai: AIClient, inline: InlineModeration, text: string) {
  if (inline?.type === "moderation_result") return Boolean(inline.flagged);
  const result = await ai.moderations.create({ model: MODERATION_MODEL, input: text });
  return result.results.some((item) => item.flagged);
}

// True when the model declined to answer (refusal content instead of JSON).
export function hasRefusal(output: ReadonlyArray<{ type: string; content?: unknown }>) {
  return output.some(
    (item) =>
      item.type === "message" &&
      Array.isArray(item.content) &&
      item.content.some((part: { type?: string }) => part.type === "refusal"),
  );
}
