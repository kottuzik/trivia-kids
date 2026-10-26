import { answer, answerButton, choose, expect, expectQuestion, startGame, test } from "./fixtures/test";

test("changing all four settings mid-question keeps the question and applies to the next one", async ({ page, api }) => {
  await startGame(page, { topic: "Space", difficulty: "Easy" });
  await answer(page, api.correctText());
  await page.getByRole("button", { name: "Next question" }).click();
  await expectQuestion(page, 2, 5);
  const shown = api.lastQuestion;

  await page.getByRole("button", { name: "Change settings" }).click();
  const form = page.locator("form").filter({ has: page.getByRole("button", { name: "Save changes" }) });
  await choose(form, "Русский");
  await choose(form, "Ages 13–16");
  await choose(form, "Hard");
  await form.getByLabel("Topic", { exact: true }).fill("Volcanoes");
  await form.getByRole("button", { name: "Save changes" }).click();

  // The UI switches to Russian at once, but the shown question stays exactly as it was.
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
  await expect(page.getByRole("status").filter({ hasText: "Сохранено" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: shown.text })).toBeVisible();
  await expect(page.locator("section[lang]").filter({ hasText: shown.text })).toHaveAttribute("lang", "en");
  expect(api.questions).toHaveLength(2);

  await answerButton(page, api.correctText()).click();
  await expect(page.getByRole("heading", { name: "Правильно!" })).toBeFocused();
  await page.getByRole("button", { name: "Следующий вопрос" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Вопрос 3 из 5" })).toBeVisible();

  expect(api.questionRequests.at(-1)).toMatchObject({
    locale: "ru",
    ageGroup: "13-16",
    difficulty: "hard",
    topic: "Volcanoes",
  });
});
