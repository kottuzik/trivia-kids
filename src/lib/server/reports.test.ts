import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ReportRequestSchema } from "@/lib/reports/schemas";
import { validReport } from "@/test/reportFixture";
import { ReportSaveError, reportIdFor, saveReport, toReportRow } from "./reports";

const row = toReportRow(ReportRequestSchema.parse(validReport));

function fakeFetch(body: unknown, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
  );
}

describe("reportIdFor", () => {
  it("is stable for the same question and issue, and differs otherwise", () => {
    const id = "4f8a3c1e-2b7d-4e9a-8c6f-1a2b3c4d5e6f";
    expect(reportIdFor(id, "wrong_answer")).toBe(reportIdFor(id, "wrong_answer"));
    expect(reportIdFor(id, "wrong_answer")).not.toBe(reportIdFor(id, "confusing"));
    expect(reportIdFor(id, "other")).toMatch(/^[0-9a-f]{24}$/);
  });
});

describe("toReportRow", () => {
  it("builds the sheet row with a Hebrew issue label and answer number", () => {
    expect(row).toMatchObject({
      issueType: "תשובה לא נכונה",
      answers: ["Venus", "Mars", "Jupiter", "Saturn"],
      correctAnswer: 2,
      topic: "space",
      locale: "en",
    });
  });
});

describe("saveReport", () => {
  beforeEach(() => {
    vi.stubEnv("REPORTS_SCRIPT_URL", "https://script.example/exec");
    vi.stubEnv("REPORTS_SHARED_SECRET", "test-secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("succeeds only when the script confirms the same reportId", async () => {
    const fetchImpl = fakeFetch({ ok: true, reportId: row.reportId });
    await expect(saveReport(row, fetchImpl)).resolves.toBeUndefined();

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://script.example/exec");
    expect(JSON.parse(init.body)).toEqual({ secret: "test-secret", report: row });
  });

  it("accepts a duplicate confirmation for the same reportId", async () => {
    await expect(
      saveReport(row, fakeFetch({ ok: true, reportId: row.reportId, duplicate: true })),
    ).resolves.toBeUndefined();
  });

  it.each([
    ["ok: false", { ok: false, error: "UNAUTHORIZED" }, 200],
    ["another reportId", { ok: true, reportId: "0".repeat(24) }, 200],
    ["no reportId", { ok: true }, 200],
    ["an HTML page", "<html>Sign in</html>", 200],
    ["a server error", { ok: true, reportId: row.reportId }, 500],
  ])("fails on %s", async (_, body, status) => {
    await expect(saveReport(row, fakeFetch(body, status))).rejects.toBeInstanceOf(ReportSaveError);
  });

  it("fails on network errors and timeouts", async () => {
    const offline = vi.fn().mockRejectedValue(new TypeError("fetch failed"));
    await expect(saveReport(row, offline)).rejects.toBeInstanceOf(ReportSaveError);
    const timeout = vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    await expect(saveReport(row, timeout)).rejects.toBeInstanceOf(ReportSaveError);
  });

  it("fails without calling the script when not configured", async () => {
    vi.stubEnv("REPORTS_SHARED_SECRET", "");
    const fetchImpl = fakeFetch({ ok: true, reportId: row.reportId });
    await expect(saveReport(row, fetchImpl)).rejects.toBeInstanceOf(ReportSaveError);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("never puts the secret in the error message", async () => {
    const error = await saveReport(row, fakeFetch({ ok: false, error: "UNAUTHORIZED" })).catch((e) => e);
    expect(String(error.message)).not.toContain("test-secret");
  });
});
