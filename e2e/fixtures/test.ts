import { test as base, expect, type BrowserContext, type Locator, type Page } from "@playwright/test";
import type { Locale } from "../../src/i18n/locales";
import type { AgeGroup } from "../../src/lib/ageGroups";
import { MockApi } from "./mockApi";

type Fixtures = { api: MockApi };

// Every test gets a mocked API, and English with ages 10–12 unless it sets its own cookies.
export const test = base.extend<Fixtures>({
  api: [
    async ({ page, context, baseURL }, use) => {
      await setPreferences(context, baseURL!, { locale: "en", ageGroup: "10-12" });
      await use(await new MockApi().install(page));
    },
    { auto: true },
  ],
});

export { expect };

export async function setPreferences(
  context: BrowserContext,
  baseURL: string,
  { locale, ageGroup }: { locale: Locale; ageGroup?: AgeGroup },
) {
  const cookies: { name: string; value: string; url: string }[] = [{ name: "locale", value: locale, url: baseURL }];
  if (ageGroup) cookies.push({ name: "ageGroup", value: ageGroup, url: baseURL });
  await context.addCookies(cookies);
}

export async function startGame(
  page: Page,
  { count = 5, topic = "Space", difficulty = "Easy" }: { count?: 5 | 10 | 15; topic?: string; difficulty?: string } = {},
) {
  await page.goto("/quiz");
  await choose(page, new RegExp(`^${difficulty}`));
  await choose(page, `${count} questions`);
  await page.getByLabel("Topic", { exact: true }).fill(topic);
  await page.getByRole("button", { name: "Start game" }).click();
  await expectQuestion(page, 1, count);
}

// Radio inputs are visually hidden inside card-like labels, so the child (and the test) taps the label.
export async function choose(scope: Page | Locator, name: string | RegExp) {
  const page = "page" in scope ? scope.page() : scope;
  const radio = page.getByRole("radio", { name, exact: typeof name === "string" });
  const label = scope.locator("label").filter({ has: radio });
  await label.click();
  await expect(label.getByRole("radio")).toBeChecked();
}

// Reads the saved game straight from IndexedDB, as the app would after a reload.
export async function savedGame(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ selectedAnswerId: string | null; completedCount: number } | null>((resolve) => {
        const open = indexedDB.open("trivia-kids");
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains("game")) return resolve(null);
          const get = db.transaction("game").objectStore("game").get("active");
          get.onsuccess = () => resolve(get.result?.game ?? null);
          get.onerror = () => resolve(null);
        };
        open.onerror = () => resolve(null);
      }),
  );
}

// The game is saved right after each change; a test reload waits for that, as a real one
// a moment later would.
export async function waitForSave(page: Page, check: (game: NonNullable<Awaited<ReturnType<typeof savedGame>>>) => boolean) {
  await expect.poll(async () => {
    const game = await savedGame(page);
    return game !== null && check(game);
  }).toBe(true);
}

export async function expectQuestion(page: Page, n: number, total: number) {
  await expect(page.getByRole("heading", { level: 1, name: `Question ${n} of ${total}` })).toBeVisible();
}

export function answerButton(page: Page, text: string) {
  return page.getByRole("button", { name: new RegExp(text) });
}

export async function answer(page: Page, text: string) {
  await answerButton(page, text).click();
  await expect(page.getByRole("heading", { name: /^(Correct!|Not quite)$/ })).toBeFocused();
}
