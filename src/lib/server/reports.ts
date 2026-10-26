import "server-only";
import { createHash } from "node:crypto";
import { ANSWER_IDS } from "@/lib/game/schemas";
import type { IssueType, ReportRequest } from "@/lib/reports/schemas";

// Apps Script answers within a few seconds; it waits up to 10 s for its own lock.
const SCRIPT_TIMEOUT_MS = 15_000;

// The sheet is read by the admin, so issue types are written as Hebrew labels.
const ISSUE_LABELS: Record<IssueType, string> = {
  not_for_kids: "שאלה לא מתאימה לילדים",
  wrong_answer: "תשובה לא נכונה",
  off_topic: "נושא לא מתאים",
  confusing: "שאלה מבלבלת",
  other: "בעיה אחרת",
};

export class ReportSaveError extends Error {
  constructor(reason: string) {
    super(`report not saved: ${reason}`);
  }
}

// Same question + same issue type always gives the same id, so retries (by the child or
// after a failure) never add a second row (see ADR-9).
export function reportIdFor(questionId: string, issueType: IssueType) {
  return createHash("sha256").update(`${questionId}:${issueType}`).digest("hex").slice(0, 24);
}

export type ReportRow = {
  reportId: string;
  issueType: string;
  topic: string;
  locale: string;
  ageGroup: string;
  difficulty: string;
  questionText: string;
  answers: string[];
  // 1–4, matching the answer1–answer4 columns.
  correctAnswer: number;
  explanation: string;
};

export function toReportRow({ issueType, question }: ReportRequest): ReportRow {
  return {
    reportId: reportIdFor(question.id, issueType),
    issueType: ISSUE_LABELS[issueType],
    topic: question.topic,
    locale: question.locale,
    ageGroup: question.ageGroup,
    difficulty: question.difficulty,
    questionText: question.text,
    answers: question.answers.map((answer) => answer.text),
    correctAnswer: ANSWER_IDS.indexOf(question.correctAnswerId) + 1,
    explanation: question.explanation,
  };
}

// Succeeds only when Apps Script explicitly confirms that this reportId is in the sheet.
// Errors carry a short reason only: never the secret, the script URL or the question text.
export async function saveReport(row: ReportRow, fetchImpl: typeof fetch = fetch): Promise<void> {
  const url = process.env.REPORTS_SCRIPT_URL;
  const secret = process.env.REPORTS_SHARED_SECRET;
  if (!url || !secret) throw new ReportSaveError("not configured");

  let response: Response;
  try {
    // Google answers with a redirect to the result page; fetch follows it with a GET.
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, report: row }),
      redirect: "follow",
      signal: AbortSignal.timeout(SCRIPT_TIMEOUT_MS),
    });
  } catch {
    throw new ReportSaveError("network");
  }

  const data = (await response.json().catch(() => null)) as {
    ok?: unknown;
    reportId?: unknown;
    error?: unknown;
  } | null;
  if (!response.ok || data?.ok !== true || data.reportId !== row.reportId) {
    const reason = typeof data?.error === "string" ? data.error.slice(0, 40) : `status ${response.status}`;
    throw new ReportSaveError(reason);
  }
}
