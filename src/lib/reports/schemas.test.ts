import { describe, expect, it } from "vitest";
import { validReport } from "@/test/reportFixture";
import { ReportRequestSchema } from "./schemas";

function withQuestion(changes: Record<string, unknown>) {
  return { ...validReport, question: { ...validReport.question, ...changes } };
}

describe("ReportRequestSchema", () => {
  it("accepts a valid report", () => {
    expect(ReportRequestSchema.safeParse(validReport).success).toBe(true);
  });

  it("rejects an unknown issue type", () => {
    expect(ReportRequestSchema.safeParse({ ...validReport, issueType: "spam" }).success).toBe(false);
  });

  it("rejects three or five answers and repeated answer ids", () => {
    const answers = validReport.question.answers;
    for (const bad of [
      answers.slice(0, 3),
      [...answers, { id: "a", text: "Pluto" }],
      [answers[0], answers[0], answers[2], answers[3]],
    ]) {
      expect(ReportRequestSchema.safeParse(withQuestion({ answers: bad })).success).toBe(false);
    }
  });

  it("rejects text that is too long", () => {
    expect(ReportRequestSchema.safeParse(withQuestion({ text: "x".repeat(301) })).success).toBe(false);
    expect(ReportRequestSchema.safeParse(withQuestion({ explanation: "x".repeat(601) })).success).toBe(false);
  });

  it("rejects extra fields (no free-text notes or child data)", () => {
    expect(ReportRequestSchema.safeParse({ ...validReport, note: "my name is Dana" }).success).toBe(false);
    expect(ReportRequestSchema.safeParse(withQuestion({ childName: "Dana" })).success).toBe(false);
  });

  it("cleans control characters", () => {
    const parsed = ReportRequestSchema.parse(withQuestion({ text: "Which\u0000 planet?\n" }));
    expect(parsed.question.text).toBe("Which planet?");
  });
});
