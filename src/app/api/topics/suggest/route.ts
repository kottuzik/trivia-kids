import { TopicsRequestSchema } from "@/lib/game/schemas";
import { clientIp, errorResponse, isSameOrigin, jsonResponse, readJson } from "@/lib/server/http";
import { getOpenAI, toErrorCode } from "@/lib/server/openai";
import { LIMITS, isRateLimited } from "@/lib/server/rateLimit";
import { suggestTopics } from "@/lib/server/topics";

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("INVALID_INPUT", 403);

  const { limit, windowMs } = LIMITS.topics;
  if (isRateLimited(`topics:${clientIp(request)}`, limit, windowMs)) {
    return errorResponse("RATE_LIMITED");
  }

  const parsed = TopicsRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse("INVALID_INPUT");

  try {
    const topics = await suggestTopics(parsed.data, getOpenAI());
    return jsonResponse({ topics });
  } catch (error) {
    return errorResponse(toErrorCode(error));
  }
}
