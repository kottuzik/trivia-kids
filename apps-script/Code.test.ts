import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { beforeEach, describe, expect, it } from "vitest";

const source = readFileSync(fileURLToPath(new URL("./Code.gs", import.meta.url)), "utf8");
const SECRET = "dev-secret";

// Minimal stand-ins for the Google services Code.gs uses.
function loadScript() {
  const rows: unknown[][] = [["createdAt", "reportId"]];
  const sheet = {
    getLastRow: () => rows.length,
    getRange: () => ({
      createTextFinder: (text: string) => ({
        matchEntireCell: () => ({
          findNext: () => (rows.some((row) => row[1] === text) ? {} : null),
        }),
      }),
    }),
    appendRow: (row: unknown[]) => rows.push(row),
  };
  const context = vm.createContext({
    SpreadsheetApp: { openById: () => ({ getSheetByName: () => sheet }), flush: () => {} },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (name: string) => ({ SPREADSHEET_ID: "sheet-id", REPORTS_SHARED_SECRET: SECRET })[name],
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    ContentService: {
      MimeType: { JSON: "json" },
      createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }),
    },
  });
  vm.runInContext(source, context);
  const doPost = (body: unknown) =>
    context.doPost({ postData: { contents: typeof body === "string" ? body : JSON.stringify(body) } });
  return { rows, doPost };
}

const report = {
  reportId: "a1b2c3d4e5f6a1b2c3d4e5f6",
  issueType: "תשובה לא נכונה",
  topic: "space",
  locale: "en",
  ageGroup: "10-12",
  difficulty: "easy",
  questionText: "Which planet is known as the Red Planet?",
  answers: ["Venus", "Mars", "Jupiter", "Saturn"],
  correctAnswer: 2,
  explanation: "Mars looks red because of iron oxide.",
};

let script: ReturnType<typeof loadScript>;
beforeEach(() => {
  script = loadScript();
});

describe("doPost", () => {
  it("adds a full row with status 'חדש'", () => {
    expect(script.doPost({ secret: SECRET, report })).toEqual({ ok: true, reportId: report.reportId });
    expect(script.rows).toHaveLength(2);
    const row = script.rows[1];
    expect(row).toHaveLength(15);
    // The Date comes from the vm context, so instanceof would not match this realm.
    expect(Object.prototype.toString.call(row[0])).toBe("[object Date]");
    expect(row.slice(1)).toEqual([
      report.reportId, "תשובה לא נכונה", "space", "en", "10-12", "easy", report.questionText,
      "Venus", "Mars", "Jupiter", "Saturn", 2, report.explanation, "חדש",
    ]);
  });

  it.each([["a wrong secret", "nope"], ["no secret", undefined]])("rejects %s without writing", (_, secret) => {
    expect(script.doPost({ secret, report })).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(script.rows).toHaveLength(1);
  });

  it("rejects bad JSON and invalid reports", () => {
    expect(script.doPost("not json")).toEqual({ ok: false, error: "BAD_REQUEST" });
    expect(script.doPost({ secret: SECRET, report: { ...report, answers: ["a", "b"] } })).toMatchObject({ ok: false });
    expect(script.doPost({ secret: SECRET, report: { ...report, issueType: "x" } })).toMatchObject({ ok: false });
    expect(script.doPost({ secret: SECRET, report: { ...report, reportId: "=1+1" } })).toMatchObject({ ok: false });
    expect(script.rows).toHaveLength(1);
  });

  it("does not add a second row for the same reportId", () => {
    script.doPost({ secret: SECRET, report });
    expect(script.doPost({ secret: SECRET, report })).toEqual({
      ok: true,
      reportId: report.reportId,
      duplicate: true,
    });
    expect(script.rows).toHaveLength(2);
  });

  it("stores formula-like text as plain text", () => {
    script.doPost({
      secret: SECRET,
      report: {
        ...report,
        topic: '=HYPERLINK("http://evil","x")',
        questionText: "+1 or -1?",
        answers: ["-2", "@me", "\tx", "ok"],
      },
    });
    const row = script.rows[1];
    expect(row[3]).toBe('\'=HYPERLINK("http://evil","x")');
    expect(row[7]).toBe("'+1 or -1?");
    expect(row.slice(8, 12)).toEqual(["'-2", "'@me", "'\tx", "ok"]);
  });
});
