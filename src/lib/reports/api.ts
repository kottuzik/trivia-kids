import { GameApiError, postJson } from "@/lib/game/api";
import type { Question } from "@/lib/game/schemas";
import type { IssueType, ReportRequest } from "./schemas";

// Longer than the server's own wait for Apps Script, so the server normally answers first.
const REPORT_TIMEOUT_MS = 25_000;

// Resolves only once the server confirmed that the row was saved in the sheet.
export async function sendReport(question: Question, issueType: IssueType): Promise<void> {
  const request: ReportRequest = {
    issueType,
    question: {
      id: question.id,
      text: question.text,
      answers: question.answers,
      correctAnswerId: question.correctAnswerId,
      explanation: question.explanation,
      topic: question.topic,
      locale: question.locale,
      ageGroup: question.ageGroup,
      difficulty: question.difficulty,
    },
  };
  const data = (await postJson("/api/reports", request, REPORT_TIMEOUT_MS, "REPORT_SAVE_FAILED")) as {
    ok?: unknown;
  } | null;
  if (data?.ok !== true) throw new GameApiError("REPORT_SAVE_FAILED");
}
