import type { Page } from "@playwright/test";
import { getDictionary } from "../src/i18n/getDictionary";
import { LOCALES } from "../src/i18n/locales";
import { choose, expect, setPreferences, test } from "./fixtures/test";

// Computers: the main game screens fit in a small laptop window (1366×650 visible) without
// scrolling. The about page and error messages may still scroll.
test.use({ viewport: { width: 1366, height: 650 } });

async function expectNoScroll(page: Page, label: string) {
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(height, `page height on "${label}"`).toBeLessThanOrEqual(650);
}

for (const locale of LOCALES) {
  const t = getDictionary(locale);

  test(`${locale}: the game screens fit a laptop window without scrolling`, async ({ page, context, baseURL, api }, testInfo) => {
    test.skip(testInfo.project.name !== "desktop", "Computer layout only.");
    await setPreferences(context, baseURL!, { locale, ageGroup: "10-12" });

    await page.goto("/");
    await expect(page.getByRole("button", { name: t.home.start })).toBeVisible();
    await expectNoScroll(page, "home");

    await page.goto("/quiz");
    await page.getByRole("button", { name: t.quiz.suggestTopics }).click();
    await page.getByRole("button", { name: "Space" }).click();
    await choose(page, new RegExp(`^${t.quiz.difficulties.easy.label}`));
    await choose(page, t.quiz.countOption.replace("{n}", "5"));
    await expectNoScroll(page, "setup with suggestions");

    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByRole("button", { name: api.correctText() })).toBeVisible();
    await expectNoScroll(page, "question");
    await page.getByRole("button", { name: api.wrongText() }).click();
    await expect(page.getByRole("heading", { name: t.quiz.incorrect })).toBeVisible();
    await expectNoScroll(page, "feedback");

    await page.goto("/");
    await expect(page.getByRole("heading", { name: t.home.savedGameTitle })).toBeVisible();
    await expectNoScroll(page, "home with saved game");

    await page.goto("/quiz");
    for (let n = 1; n <= 4; n++) {
      await page.getByRole("button", { name: t.quiz.next }).click();
      await page.getByRole("button", { name: n === 2 ? api.wrongText() : api.correctText() }).click();
    }
    await page.getByRole("button", { name: t.quiz.toSummary }).click();
    await expect(page.getByRole("heading", { level: 1, name: t.summary.title })).toBeVisible();
    await expectNoScroll(page, "summary");
  });
}
