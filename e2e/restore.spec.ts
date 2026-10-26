import { answer, expect, expectQuestion, startGame, test, waitForSave } from "./fixtures/test";

test("a reload in the middle of a question brings back the same question", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.correctText());
  await page.getByRole("button", { name: "Next question" }).click();
  await expectQuestion(page, 2, 5);
  const shown = api.lastQuestion.text;

  await page.reload();
  await expectQuestion(page, 2, 5);
  await expect(page.getByRole("heading", { level: 2, name: shown })).toBeVisible();
  expect(api.questions).toHaveLength(2);
});

test("a reload after answering keeps the feedback, score and mistakes", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.wrongText());
  const wrongQuestion = api.lastQuestion;
  await waitForSave(page, (game) => game.selectedAnswerId !== null);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Not quite" })).toBeVisible();
  await expect(page.getByText(wrongQuestion.explanation)).toBeVisible();

  for (let n = 2; n <= 5; n++) {
    await page.getByRole("button", { name: "Next question" }).click();
    await expectQuestion(page, n, 5);
    await answer(page, api.correctText());
  }
  await page.getByRole("button", { name: "See game summary" }).click();
  await expect(page.getByText("4 of 5")).toBeVisible();
  await expect(page.getByText(wrongQuestion.text)).toBeVisible();
});

test("leaving for home and about pauses the game; continue picks it up", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.correctText());
  await page.getByRole("button", { name: "Next question" }).click();
  await expectQuestion(page, 2, 5);

  await page.getByRole("link", { name: "Back to home" }).click();
  await expect(page.getByRole("heading", { name: "You have a saved game" })).toBeVisible();
  await expect(page.getByText("Question 2 of 5")).toBeVisible();
  await page.getByRole("link", { name: "About", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: "About" })).toBeVisible();

  // Closing the app and opening it again: a fresh page in the same browser profile.
  const reopened = await page.context().newPage();
  await page.close();
  await reopened.goto("/");
  await reopened.getByRole("link", { name: "Continue game" }).click();
  await expectQuestion(reopened, 2, 5);
  await expect(reopened.getByRole("heading", { level: 2, name: api.lastQuestion.text })).toBeVisible();
});

test("new game asks first: cancel keeps the game, confirm starts clean", async ({ page, api }) => {
  await startGame(page);
  await answer(page, api.correctText());
  await page.goto("/");

  await page.getByRole("button", { name: "New game" }).click();
  const dialog = page.getByRole("dialog", { name: "Start a new game?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "No, keep playing" })).toBeFocused();
  await dialog.getByRole("button", { name: "No, keep playing" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("heading", { name: "You have a saved game" })).toBeVisible();

  await page.getByRole("button", { name: "New game" }).click();
  await dialog.getByRole("button", { name: "Yes, new game" }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  await expect(page.getByRole("heading", { level: 1, name: "Game setup" })).toBeVisible();

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start playing" })).toBeVisible();
});
