import type { Locator, Page } from "@playwright/test";
import { format, getDictionary } from "../src/i18n/getDictionary";
import { LOCALES } from "../src/i18n/locales";
import { expectNoA11yViolations, expectVisibleFocus } from "./fixtures/a11y";
import { choose, expect, setPreferences, test } from "./fixtures/test";

for (const locale of LOCALES) {
  const t = getDictionary(locale);

  test(`${locale}: every screen and state passes automated WCAG 2.2 AA checks`, async ({ page, context, baseURL, api }) => {
    await setPreferences(context, baseURL!, { locale, ageGroup: "10-12" });

    await page.goto("/");
    await expectNoA11yViolations(page, "home");
    await page.getByRole("button", { name: t.common.menuOpen }).click();
    await expectNoA11yViolations(page, "home with menu open");

    await page.goto("/about");
    await expectNoA11yViolations(page, "about");

    await page.goto("/quiz");
    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByText(t.quiz.errors.missingDifficulty)).toBeVisible();
    await expectNoA11yViolations(page, "setup with errors");

    await choose(page, new RegExp(`^${t.quiz.difficulties.easy.label}`));
    await choose(page, format(t.quiz.countOption, { n: 5 }));
    await page.getByRole("button", { name: t.quiz.suggestTopics }).click();
    await page.getByRole("button", { name: "Space" }).click();
    await expectNoA11yViolations(page, "setup with suggestions");

    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByRole("heading", { level: 1, name: format(t.quiz.progress, { n: 1, total: 5 }) })).toBeVisible();
    await expectNoA11yViolations(page, "question");

    await page.getByRole("button", { name: t.quiz.settingsButton }).click();
    await expectNoA11yViolations(page, "question with settings open");
    await page.getByRole("button", { name: t.quiz.settingsButton }).click();

    await page.getByRole("button", { name: t.quiz.report.open }).click();
    const dialog = page.getByRole("dialog", { name: t.quiz.report.title });
    await dialog.getByRole("button", { name: t.quiz.report.send }).click();
    await expectNoA11yViolations(page, "report dialog with error");
    api.failNextReports("REPORT_SAVE_FAILED");
    await choose(dialog, t.quiz.report.issues.confusing);
    await dialog.getByRole("button", { name: t.quiz.report.send }).click();
    await expect(dialog.getByRole("alert").filter({ hasText: t.quiz.report.errors.REPORT_SAVE_FAILED })).toBeVisible();
    await expectNoA11yViolations(page, "report failed");
    await dialog.getByRole("button", { name: t.quiz.report.tryAgain }).click();
    await expect(dialog.getByText(t.quiz.report.sent)).toBeVisible();
    await expectNoA11yViolations(page, "report sent");
    await dialog.getByRole("button", { name: t.quiz.report.backToGame }).click();

    await context.setOffline(true);
    await expect(page.getByText(t.quiz.offlineBanner)).toBeVisible();
    await expectNoA11yViolations(page, "question offline");
    await context.setOffline(false);

    await page.getByRole("button", { name: api.wrongText() }).click();
    await expect(page.getByRole("heading", { name: t.quiz.incorrect })).toBeVisible();
    await expectNoA11yViolations(page, "wrong-answer feedback");

    api.failNextQuestions("AI_UNAVAILABLE");
    await page.getByRole("button", { name: t.quiz.next }).click();
    await expect(page.getByRole("heading", { name: t.quiz.errorTitle })).toBeVisible();
    await expectNoA11yViolations(page, "question error");
    await page.getByRole("button", { name: t.quiz.tryAgain }).click();

    for (let n = 2; n <= 5; n++) {
      await page.getByRole("button", { name: api.correctText() }).click();
      await expect(page.getByRole("heading", { name: t.quiz.correct })).toBeVisible();
      if (n === 2) await expectNoA11yViolations(page, "correct-answer feedback");
      await page.getByRole("button", { name: n === 5 ? t.quiz.toSummary : t.quiz.next }).click();
    }
    await expect(page.getByRole("heading", { level: 1, name: t.summary.title })).toBeVisible();
    await expectNoA11yViolations(page, "summary");
  });

  test(`${locale}: home with a saved game and the new-game dialog pass WCAG checks`, async ({ page, context, baseURL }) => {
    await setPreferences(context, baseURL!, { locale, ageGroup: "6-9" });
    await page.goto("/quiz");
    await choose(page, new RegExp(`^${t.quiz.difficulties.medium.label}`));
    await choose(page, format(t.quiz.countOption, { n: 10 }));
    await page.getByLabel(t.quiz.topicLabel, { exact: true }).fill("Oceans");
    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByRole("heading", { level: 1, name: format(t.quiz.progress, { n: 1, total: 10 }) })).toBeVisible();

    await page.goto("/");
    await expect(page.getByRole("heading", { name: t.home.savedGameTitle })).toBeVisible();
    await expectNoA11yViolations(page, "home with saved game");
    await page.getByRole("button", { name: t.home.newGame }).click();
    await expect(page.getByRole("dialog", { name: t.confirmNewGame.title })).toBeVisible();
    await expectNoA11yViolations(page, "new game dialog");
  });
}

// Presses Tab until `target` has focus, checking that every stop shows a visible focus ring.
async function tabTo(page: Page, target: Locator, { backwards = false, maxSteps = 40 } = {}) {
  for (let step = 0; step < maxSteps; step++) {
    await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
    await expectVisibleFocus(page, `(step ${step} towards ${target})`);
    if (await target.evaluate((element) => element === document.activeElement)) return;
  }
  throw new Error(`Could not reach ${target} with Tab`);
}

test("a whole game can be played with the keyboard only", async ({ page, api }) => {
  await page.goto("/");
  // The start button appears once the saved-game check is done: the page is ready for keys.
  await expect(page.getByRole("button", { name: "Start playing" })).toBeVisible();

  // The skip link is the first stop and jumps to the content.
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  await expectVisibleFocus(page);

  await tabTo(page, page.getByRole("button", { name: "Start playing" }));
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Game setup" })).toBeVisible();

  // Radio groups: Tab into the group, arrows to move, the choice follows.
  await tabTo(page, page.getByRole("radio", { name: /^Easy/ }));
  await page.keyboard.press("ArrowDown");
  await expect(page.getByRole("radio", { name: /^Medium/ })).toBeChecked();
  await tabTo(page, page.getByRole("radio", { name: "5 questions", exact: true }));
  await page.keyboard.press("Space");
  await expect(page.getByRole("radio", { name: "5 questions", exact: true })).toBeChecked();
  await tabTo(page, page.getByLabel("Topic", { exact: true }));
  await page.keyboard.type("Space");
  await page.keyboard.press("Enter");

  for (let n = 1; n <= 5; n++) {
    await expect(page.getByRole("heading", { level: 2, name: api.lastQuestion.text })).toBeFocused();
    if (n === 1) {
      // Report dialog: opens with the keyboard, Escape closes it and focus comes back.
      const report = page.getByRole("button", { name: "Report question" });
      await tabTo(page, report);
      await page.keyboard.press("Enter");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(report).toBeFocused();
    }
    await tabTo(page, page.getByRole("button", { name: api.correctText() }), { backwards: n === 1 });
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Correct!" })).toBeFocused();
    await tabTo(page, page.getByRole("button", { name: n === 5 ? "See game summary" : "Next question" }));
    await page.keyboard.press("Enter");
  }

  await expect(page.getByRole("heading", { level: 1, name: "Well done!" })).toBeFocused();
  await tabTo(page, page.getByRole("link", { name: "Back to home" }).last());
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/$/);
});

test("the menu opens and closes with the keyboard", async ({ page }) => {
  await page.goto("/about");
  const toggle = page.getByRole("button", { name: "Open menu" });
  await tabTo(page, toggle);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "About" }).first()).toHaveAttribute("aria-current", "page");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Open menu" })).toBeFocused();
});

test("animations are turned off when the device asks for reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await startSpinner(page);
  const duration = await page.locator("[aria-busy=true] span").first().evaluate((el) => getComputedStyle(el).animationDuration);
  expect(parseFloat(duration)).toBeLessThanOrEqual(0.00001 * 1000);
});

async function startSpinner(page: Page) {
  // A question that never arrives keeps the loading state on screen.
  await page.route("**/api/questions/generate", () => {});
  await page.goto("/quiz");
  await choose(page, /^Easy/);
  await choose(page, "5 questions");
  await page.getByLabel("Topic", { exact: true }).fill("Space");
  await page.getByRole("button", { name: "Start game" }).click();
  await expect(page.locator("[aria-busy=true]")).toBeVisible();
}

// WCAG 1.4.10: at 320px wide (also what 400% zoom of a 1280px window looks like) nothing
// needs sideways scrolling, in both directions of text.
for (const locale of ["he", "ru"] as const) {
  test(`${locale}: content reflows at 320px without horizontal scrolling`, async ({ page, context, baseURL, api }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "One narrow-screen pass is enough.");
    const t = getDictionary(locale);
    await setPreferences(context, baseURL!, { locale, ageGroup: "13-16" });
    await page.setViewportSize({ width: 320, height: 640 });
    const expectNoSideScroll = async (label: string) => {
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(width, `page width on "${label}"`).toBeLessThanOrEqual(320);
    };

    for (const path of ["/", "/about", "/quiz"]) {
      await page.goto(path);
      await expect(page.locator("main h1")).toBeVisible();
      await expectNoSideScroll(path);
    }
    await choose(page, new RegExp(`^${t.quiz.difficulties.hard.label}`));
    await choose(page, format(t.quiz.countOption, { n: 15 }));
    await page.getByLabel(t.quiz.topicLabel, { exact: true }).fill("Very long topic name about ancient civilizations");
    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByRole("heading", { level: 1, name: format(t.quiz.progress, { n: 1, total: 15 }) })).toBeVisible();
    await page.getByRole("button", { name: t.quiz.settingsButton }).click();
    await expectNoSideScroll("question with settings");
    await page.getByRole("button", { name: api.wrongText() }).click();
    await expect(page.getByRole("heading", { name: t.quiz.incorrect })).toBeVisible();
    await expectNoSideScroll("feedback");
    await page.getByRole("button", { name: t.quiz.report.open }).click();
    await expectNoSideScroll("report dialog");
  });
}
