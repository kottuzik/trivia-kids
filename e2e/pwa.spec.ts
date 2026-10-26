import { expect, test } from "./fixtures/test";

test.use({ serviceWorkers: "allow" });

// Real network only here: the API mock would answer even while offline.
test.beforeEach(async ({ page }) => {
  await page.unrouteAll();
});

test("the manifest describes an installable app with working icons", async ({ page }) => {
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    name: "Trivia Kids",
    lang: "en",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
  });
  const sizes = manifest.icons.map((icon: { sizes: string }) => icon.sizes);
  expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]));
  expect(manifest.icons.some((icon: { purpose: string }) => icon.purpose === "maskable")).toBe(true);
  for (const icon of manifest.icons) {
    const file = await page.request.get(icon.src);
    expect(file.ok()).toBe(true);
    expect(file.headers()["content-type"]).toBe("image/png");
  }

  await page.goto("/");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
});

test("the manifest follows the chosen language", async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: "locale", value: "he", url: baseURL! }]);
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "טריוויה קידס", lang: "he", dir: "rtl" });
});

test("the service worker caches static files only, never pages or API answers", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The first visit installs the worker; the next pages go through it.
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.goto("/about");
  await page.goto("/quiz");

  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const key of await caches.keys()) {
      const cache = await caches.open(key);
      urls.push(...(await cache.keys()).map((request) => new URL(request.url).pathname));
    }
    return urls;
  });
  expect(cached.some((path) => path.startsWith("/_next/static/"))).toBe(true);
  expect(cached).toContain("/icons/icon-192.png");
  for (const path of cached) {
    expect(path).not.toMatch(/^\/api\//);
    expect(["/", "/quiz", "/about", "/manifest.webmanifest"]).not.toContain(path);
  }

  // Offline: a cached file still loads, but no new question can be created.
  const script = cached.find((path) => path.endsWith(".js"))!;
  await context.setOffline(true);
  const offline = await page.evaluate(async (scriptPath) => {
    const asset = await fetch(scriptPath).then((r) => r.ok, () => false);
    const question = await fetch("/api/questions/generate", { method: "POST", body: "{}" }).then(
      () => "answered",
      () => "failed",
    );
    return { asset, question };
  }, script);
  expect(offline).toEqual({ asset: true, question: "failed" });
});

test("security headers are sent, and the worker itself is never cached", async ({ page }) => {
  const home = await page.request.get("/");
  const csp = home.headers()["content-security-policy"];
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(home.headers()["x-content-type-options"]).toBe("nosniff");

  const worker = await page.request.get("/sw.js");
  expect(worker.headers()["cache-control"]).toContain("no-store");
});

test("pages run under the security policy without being blocked", async ({ page }) => {
  const blocked: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && /Content Security Policy/i.test(message.text())) blocked.push(message.text());
  });
  for (const path of ["/", "/quiz", "/about"]) {
    await page.goto(path);
    await expect(page.locator("main h1")).toBeVisible();
  }
  expect(blocked).toEqual([]);
});
