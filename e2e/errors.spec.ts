import { getDictionary } from "../src/i18n/getDictionary";
import type { ApiErrorCode } from "../src/lib/game/schemas";
import { answer, choose, expect, expectQuestion, startGame, test } from "./fixtures/test";

const t = getDictionary("en");
const CODES: ApiErrorCode[] = ["AI_UNAVAILABLE", "AI_INVALID_RESPONSE", "RATE_LIMITED", "UNSAFE_TOPIC"];

for (const code of CODES) {
  test(`${code}: a friendly message and retry, with progress kept`, async ({ page, api }) => {
    await startGame(page);
    await answer(page, api.correctText());

    api.failNextQuestions(code);
    await page.getByRole("button", { name: "Next question" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Oops!" })).toBeFocused();
    await expect(page.getByText(t.quiz.apiErrors[code])).toBeVisible();

    // The failure survives a reload without losing the score.
    await page.reload();
    await expect(page.getByText(t.quiz.apiErrors[code])).toBeVisible();

    await page.getByRole("button", { name: "Try again" }).click();
    await expectQuestion(page, 2, 5);
    for (let n = 2; n <= 5; n++) {
      if (n > 2) await expectQuestion(page, n, 5);
      await answer(page, api.correctText());
      await page.getByRole("button", { name: n === 5 ? "See game summary" : "Next question" }).click();
    }
    await expect(page.getByText("5 of 5")).toBeVisible();
  });
}

test("an unsuitable topic at the start asks for another topic", async ({ page, api }) => {
  api.failNextQuestions("UNSAFE_TOPIC");
  await page.goto("/quiz");
  await choose(page, /^Easy/);
  await choose(page, "5 questions");
  await page.getByLabel("Topic", { exact: true }).fill("Something bad");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.getByText(t.quiz.apiErrors.UNSAFE_TOPIC).or(page.getByText(t.quiz.errors.UNSAFE_TOPIC))).toBeVisible();
});

test("offline: the loaded question can be answered; the next one waits for the connection", async ({ page, context, api }) => {
  await startGame(page);
  const question = api.lastQuestion;

  await context.setOffline(true);
  await expect(page.getByText(t.quiz.offlineBanner)).toBeVisible();
  await answer(page, api.wrongText());
  await expect(page.getByText(question.explanation)).toBeVisible();
  await expect(page.getByText(`The correct answer: ${api.correctText(question)}`)).toBeVisible();

  await page.getByRole("button", { name: "Next question" }).click();
  await expect(page.getByText(t.quiz.apiErrors.NETWORK)).toBeVisible();
  expect(api.questions).toHaveLength(1);

  // Back online: the game continues by itself, with the answer counted.
  await context.setOffline(false);
  await expectQuestion(page, 2, 5);
});

test("offline: skipping is refused and no skip is used", async ({ page, context }) => {
  await startGame(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Skip question" }).click();
  await expect(page.getByText(t.quiz.skipNeedsConnection)).toBeVisible();
  await expect(page.getByText("3 skips left")).toBeVisible();
});
