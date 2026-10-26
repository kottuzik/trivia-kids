import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// End-to-end tests run against a production build with every /api call mocked in the browser,
// so they never reach OpenAI or the Google Sheet (ADR-14).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    // page.route() can't see requests that pass through a service worker; pwa.spec allows it.
    serviceWorkers: "block",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "tablet", use: { ...devices["iPad Mini"], browserName: "chromium" } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
