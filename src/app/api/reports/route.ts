import { ReportRequestSchema } from "@/lib/reports/schemas";
import { clientIp, errorResponse, isSameOrigin, jsonResponse, readJson } from "@/lib/server/http";
import { LIMITS, isRateLimited } from "@/lib/server/rateLimit";
import { saveReport, toReportRow } from "@/lib/server/reports";

export const maxDuration = 30;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return errorResponse("INVALID_INPUT", 403);

  const { limit, windowMs } = LIMITS.reports;
  if (isRateLimited(`reports:${clientIp(request)}`, limit, windowMs)) {
    return errorResponse("RATE_LIMITED");
  }

  const parsed = ReportRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return errorResponse("INVALID_INPUT");

  try {
    await saveReport(toReportRow(parsed.data));
    return jsonResponse({ ok: true });
  } catch (error) {
    console.warn(`[reports] ${error instanceof Error ? error.message : "unknown error"}`);
    return errorResponse("REPORT_SAVE_FAILED");
  }
}
