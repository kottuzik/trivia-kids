import { answer, choose, expect, expectQuestion, startGame, test } from "./fixtures/test";

test("a report is sent and the game continues unchanged", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.wrongText());

  await page.getByRole("button", { name: "Report question" }).click();
  const dialog = page.getByRole("dialog", { name: "Report a question" });
  await expect(dialog).toBeVisible();

  // Sending without a type asks for one and sends nothing.
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByText("Choose a type of problem.")).toBeVisible();
  expect(api.reportRequests).toHaveLength(0);

  await choose(dialog, "Wrong answer");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.locator("p", { hasText: "Thank you! Your report was sent." })).toBeFocused();
  await dialog.getByRole("button", { name: "Back to the game" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("You reported this question — thank you!")).toBeFocused();

  const [report] = api.reportRequests;
  expect(report.issueType).toBe("wrong_answer");
  expect(report.question.text).toBe(api.lastQuestion.text);
  // Only question details: nothing that identifies the child.
  expect(Object.keys(report).sort()).toEqual(["issueType", "question"]);
  expect(Object.keys(report.question).sort()).toEqual(
    ["ageGroup", "answers", "correctAnswerId", "difficulty", "explanation", "id", "locale", "text", "topic"],
  );

  // The answer and the score are untouched.
  await expect(page.getByRole("heading", { name: "Not quite" })).toBeVisible();
  for (let n = 2; n <= 5; n++) {
    await page.getByRole("button", { name: "Next question" }).click();
    await expectQuestion(page, n, 5);
    await answer(page, api.correctText());
  }
  await page.getByRole("button", { name: "See game summary" }).click();
  await expect(page.getByText("4 of 5")).toBeVisible();
});

test("a failed report shows retry, never a false success, and retries the same report", async ({ page, api }) => {
  await startGame(page);
  api.failNextReports("REPORT_SAVE_FAILED");

  await page.getByRole("button", { name: "Report question" }).click();
  const dialog = page.getByRole("dialog", { name: "Report a question" });
  await choose(dialog, "Confusing question");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("alert").filter({ hasText: "We couldn't save your report. Please try again." })).toBeFocused();
  await expect(dialog.getByText("Thank you! Your report was sent.")).toBeHidden();

  await dialog.getByRole("button", { name: "Try again" }).click();
  await expect(dialog.getByText("Thank you! Your report was sent.")).toBeVisible();
  expect(api.reportRequests).toHaveLength(2);
  expect(api.reportRequests[1]).toEqual(api.reportRequests[0]);

  // The question is still open to answer after reporting.
  await dialog.getByRole("button", { name: "Back to the game" }).click();
  await answer(page, api.correctText());
});

test("pressing send twice while sending sends one report", async ({ page, api }) => {
  await startGame(page);
  api.delayReports(800);
  await page.getByRole("button", { name: "Report question" }).click();
  const dialog = page.getByRole("dialog", { name: "Report a question" });
  await choose(dialog, "Other problem");
  const send = dialog.getByRole("button", { name: "Send report" });
  // The second click lands while the first request is still on its way.
  await send.dblclick();
  await expect(dialog.getByText("Thank you! Your report was sent.")).toBeVisible();
  expect(api.reportRequests).toHaveLength(1);
});

test("a report can be closed with Escape and focus returns to the button", async ({ page }) => {
  await startGame(page);
  const open = page.getByRole("button", { name: "Report question" });
  await open.click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(open).toBeFocused();
});
