import { format, getDictionary } from "../src/i18n/getDictionary";
import { LOCALES, LOCALE_DIR, LOCALE_NATIVE_NAME } from "../src/i18n/locales";
import { choose, expect, setPreferences, test } from "./fixtures/test";

for (const locale of LOCALES) {
  const t = getDictionary(locale);

  test(`${locale}: home, game setup and about work in the chosen language`, async ({ page, context, baseURL, api }) => {
    await setPreferences(context, baseURL!, { locale, ageGroup: "6-9" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
    await expect(page.locator("html")).toHaveAttribute("dir", LOCALE_DIR[locale]);
    await expect(page.getByRole("heading", { level: 1, name: t.meta.appName })).toBeVisible();

    await page.getByRole("button", { name: t.home.start }).click();
    await expect(page).toHaveURL(/\/quiz$/);
    await expect(page.getByRole("heading", { level: 1, name: t.quiz.heading })).toBeVisible();

    // A whole first question in this language.
    await choose(page, new RegExp(`^${t.quiz.difficulties.hard.label}`));
    await choose(page, format(t.quiz.countOption, { n: 5 }));
    await page.getByRole("button", { name: t.quiz.suggestTopics }).click();
    await page.getByRole("button", { name: "Dinosaurs" }).click();
    await page.getByRole("button", { name: t.quiz.startGame }).click();
    await expect(page.getByRole("heading", { level: 1, name: format(t.quiz.progress, { n: 1, total: 5 }) })).toBeVisible();
    expect(api.questionRequests[0]).toMatchObject({ locale, ageGroup: "6-9", difficulty: "hard", topic: "Dinosaurs" });

    await page.getByRole("button", { name: t.common.menuOpen }).click();
    await page.getByRole("link", { name: t.common.nav.about }).click();
    await expect(page.getByRole("heading", { level: 1, name: t.about.heading })).toBeVisible();
    await expect(page.getByRole("heading", { name: t.about.howToPlayTitle })).toBeVisible();
    await expect(page.locator("#how-to-play li")).toHaveCount(t.about.steps.length);

    await page.getByRole("banner").getByRole("link", { name: t.common.backHome }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("button", { name: t.home.continueGame }).or(page.getByRole("link", { name: t.home.continueGame }))).toBeVisible();
  });
}

test("switching language changes texts and direction right away", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

  await choose(page, LOCALE_NATIVE_NAME.he);
  await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
  await expect(page.locator("html")).toHaveAttribute("lang", "he");
  await expect(page.getByRole("heading", { level: 1, name: getDictionary("he").meta.appName })).toBeVisible();

  await choose(page, LOCALE_NATIVE_NAME.ru);
  await expect(page.locator("html")).toHaveAttribute("dir", "ltr");
  await expect(page.getByRole("heading", { level: 1, name: getDictionary("ru").meta.appName })).toBeVisible();

  // The choice survives a reload (functional cookie).
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "ru");
});

test("each age group can be chosen, and starting without one asks for it", async ({ page, context, baseURL }) => {
  await context.clearCookies();
  await setPreferences(context, baseURL!, { locale: "en" });
  await page.goto("/");
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.getByText("To start, please choose an age group first.")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);

  for (const age of ["6–9", "13–16", "10–12"]) {
    await choose(page, new RegExp(age));
  }
  await page.getByRole("button", { name: "Start playing" }).click();
  await expect(page.getByText("Ages 10–12")).toBeVisible();
});
