import { QuestionRequestSchema } from "@/lib/game/schemas";
import { clientIp, errorResponse, isSameOrigin, jsonResponse, readJson } from "@/lib/server/http";
import { getOpenAI, toErrorCode } from "@/lib/server/openai";
import { generateQuestion } from "@/lib/server/questions";
import { LIMITS, isRateLimited } from "@/lib/server/rateLimit";

// Up to three generation attempts per request (see MAX_ATTEMPTS).
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("INVALID_INPUT", 403);

  const { limit, windowMs } = LIMITS.questions;
  if (isRateLimited(`questions:${clientIp(request)}`, limit, windowMs)) {
    return errorResponse("RATE_LIMITED");
  }

  const parsed = QuestionRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse("INVALID_INPUT");

  try {
    const question = await generateQuestion(parsed.data, getOpenAI());
    return jsonResponse({ question });
  } catch (error) {
    return errorResponse(toErrorCode(error));
  }
}
