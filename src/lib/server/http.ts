import "server-only";
import type { ApiErrorCode } from "@/lib/game/schemas";

const MAX_BODY_BYTES = 8 * 1024;

const STATUS: Record<ApiErrorCode, number> = {
  INVALID_INPUT: 400,
  UNSAFE_TOPIC: 422,
  RATE_LIMITED: 429,
  AI_INVALID_RESPONSE: 502,
  AI_UNAVAILABLE: 503,
};

const NO_STORE = { "Cache-Control": "no-store" };

export function errorResponse(code: ApiErrorCode, status = STATUS[code]) {
  return Response.json({ error: { code } }, { status, headers: NO_STORE });
}

export function jsonResponse(body: unknown) {
  return Response.json(body, { headers: NO_STORE });
}

// Browsers always send Origin on POST; requests from other sites (or without it) are refused.
export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

// Returns undefined for bodies that are too large or not JSON.
export async function readJson(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text();
  if (new TextEncoder().encode(text).length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
