import {
  isApiErrorCode,
  type ClientErrorCode,
  type Question,
  type QuestionRequest,
  type TopicsRequest,
} from "./schemas";

export class GameApiError extends Error {
  constructor(public readonly code: ClientErrorCode) {
    super(code);
  }
}

// Longer than the server's own limits, so the server normally answers first.
const QUESTION_TIMEOUT_MS = 70_000;
const TOPICS_TIMEOUT_MS = 35_000;

// `fallback` is used for timeouts and for server answers without a known error code.
export async function postJson(
  url: string,
  body: unknown,
  timeoutMs: number,
  fallback: ClientErrorCode = "AI_UNAVAILABLE",
): Promise<unknown> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    throw new GameApiError("NETWORK");
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new GameApiError(
      error instanceof DOMException && error.name === "TimeoutError" ? fallback : "NETWORK",
    );
  }

  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = (data as { error?: { code?: unknown } } | null)?.error?.code;
    throw new GameApiError(isApiErrorCode(code) ? code : fallback);
  }
  return data;
}

export async function fetchQuestion(request: QuestionRequest): Promise<Question> {
  const data = (await postJson("/api/questions/generate", request, QUESTION_TIMEOUT_MS)) as {
    question?: Question;
  };
  if (!data?.question) throw new GameApiError("AI_INVALID_RESPONSE");
  return data.question;
}

export async function fetchTopicSuggestions(request: TopicsRequest): Promise<string[]> {
  const data = (await postJson("/api/topics/suggest", request, TOPICS_TIMEOUT_MS)) as {
    topics?: string[];
  };
  if (!Array.isArray(data?.topics)) throw new GameApiError("AI_INVALID_RESPONSE");
  return data.topics;
}

export function toClientErrorCode(error: unknown): ClientErrorCode {
  return error instanceof GameApiError ? error.code : "AI_UNAVAILABLE";
}
