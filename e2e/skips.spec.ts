import { answer, expect, expectQuestion, startGame, test } from "./fixtures/test";

test("three skips replace questions without touching score or count; a fourth is not possible", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.correctText());
  await page.getByRole("button", { name: "Next question" }).click();
  await expectQuestion(page, 2, 5);

  const skip = page.getByRole("button", { name: "Skip question" });
  for (const left of ["2 skips left", "1 skip left", "You've used all three skips in this game"]) {
    const before = api.lastQuestion.text;
    await skip.click();
    await expectQuestion(page, 2, 5);
    await expect(page.getByRole("heading", { level: 2, name: before })).toBeHidden();
    await expect(page.getByText(left)).toBeVisible();
  }
  expect(api.questions).toHaveLength(5);

  // Still focusable so the reason is read out, but pressing it does nothing.
  await expect(skip).toHaveAttribute("aria-disabled", "true");
  await skip.focus();
  await page.keyboard.press("Enter");
  await expectQuestion(page, 2, 5);
  expect(api.questions).toHaveLength(5);

  // Skipped questions were never counted: finishing still takes four more answers.
  for (let n = 2; n <= 5; n++) {
    await expectQuestion(page, n, 5);
    await answer(page, api.correctText());
    await page.getByRole("button", { name: n === 5 ? "See game summary" : "Next question" }).click();
  }
  await expect(page.getByText("5 of 5")).toBeVisible();
  await expect(page.getByText("100%")).toBeVisible();
});

test("retry after a failed skip does not use another skip", async ({ page, api }) => {
  await startGame(page);
  api.failNextQuestions("AI_UNAVAILABLE");
  await page.getByRole("button", { name: "Skip question" }).click();
  await expect(page.getByRole("heading", { name: "Oops!" })).toBeVisible();

  await page.getByRole("button", { name: "Try again" }).click();
  await expectQuestion(page, 1, 5);
  await expect(page.getByText("2 skips left")).toBeVisible();
});
