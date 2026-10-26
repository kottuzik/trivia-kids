import { answer, answerButton, expect, expectQuestion, startGame, test } from "./fixtures/test";

test("a full 5-question game ends with an accurate summary", async ({ page, api }) => {
  await startGame(page, { count: 5, topic: "Space", difficulty: "Medium" });
  expect(api.questionRequests[0]).toMatchObject({
    topic: "Space",
    difficulty: "medium",
    locale: "en",
    ageGroup: "10-12",
    seenQuestionFingerprints: [],
  });

  const wrongOnes: { question: string; right: string }[] = [];
  for (let n = 1; n <= 5; n++) {
    await expectQuestion(page, n, 5);
    const question = api.lastQuestion;
    await expect(page.getByRole("heading", { level: 2, name: question.text })).toBeFocused();

    // Questions 2 and 4 are answered wrong.
    const wrong = n % 2 === 0;
    await answer(page, wrong ? api.wrongText() : api.correctText());

    // Feedback and explanation appear for both right and wrong answers.
    await expect(page.getByRole("heading", { name: wrong ? "Not quite" : "Correct!" })).toBeVisible();
    await expect(page.getByText(question.explanation)).toBeVisible();
    if (wrong) {
      await expect(page.getByText(`The correct answer: ${api.correctText()}`)).toBeVisible();
      wrongOnes.push({ question: question.text, right: api.correctText() });
    }

    // One answer only: every option is locked after choosing.
    for (const option of question.answers) {
      await expect(answerButton(page, option.text)).toBeDisabled();
    }

    await page.getByRole("button", { name: n === 5 ? "See game summary" : "Next question" }).click();
  }

  await expect(page.getByRole("heading", { level: 1, name: "Well done!" })).toBeFocused();
  await expect(page.getByText("3 of 5")).toBeVisible();
  await expect(page.getByText("60%")).toBeVisible();
  const mistakes = page.getByRole("list").filter({ hasText: wrongOnes[0].question });
  await expect(mistakes.getByRole("listitem")).toHaveCount(2);
  for (const mistake of wrongOnes) {
    await expect(mistakes.getByText(mistake.question)).toBeVisible();
    await expect(mistakes.getByText(mistake.right)).toBeVisible();
  }

  // No question repeats: every request carried the fingerprints seen so far.
  expect(api.questionRequests.at(-1)!.seenQuestionFingerprints).toHaveLength(4);
  expect(new Set(api.questions.map((q) => q.text)).size).toBe(5);

  await page.getByRole("button", { name: "New game" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Game setup" })).toBeVisible();
});

for (const count of [10, 15] as const) {
  test(`a ${count}-question game counts every question`, async ({ page, api }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Long games run once, on mobile only.");
    await startGame(page, { count });
    for (let n = 1; n <= count; n++) {
      await expectQuestion(page, n, count);
      await answer(page, n === 1 ? api.wrongText() : api.correctText());
      await page.getByRole("button", { name: n === count ? "See game summary" : "Next question" }).click();
    }
    await expect(page.getByText(`${count - 1} of ${count}`)).toBeVisible();
    await expect(page.getByText(`${Math.round(((count - 1) / count) * 100)}%`)).toBeVisible();
  });
}
