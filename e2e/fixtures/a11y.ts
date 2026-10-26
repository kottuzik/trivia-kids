import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.0–2.2 A and AA rules. Every violation fails the test, with its rule and elements listed.
export async function expectNoA11yViolations(page: Page, label: string) {
  // Check the settled screen: a fade-in caught half-way looks like low contrast.
  await page.evaluate(() =>
    Promise.all(
      document
        .getAnimations()
        .filter((animation) => animation.effect?.getComputedTiming().endTime !== Infinity)
        .map((animation) => animation.finished.catch(() => {})),
    ),
  );
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const summary = violations.map(
    (violation) => `${violation.id}: ${violation.help}\n  ${violation.nodes.map((node) => node.target.join(" ")).join("\n  ")}`,
  );
  expect(summary, `axe violations on "${label}"`).toEqual([]);
}

// The focused element (or the card around a hidden radio) shows a clear outline.
export async function expectVisibleFocus(page: Page, context = "") {
  const outline = await page.evaluate(() => {
    const active = document.activeElement as HTMLElement | null;
    if (!active || active === document.body) return null;
    const target = active.matches("input[type=radio]") ? active.closest("label")! : active;
    const style = getComputedStyle(target);
    // WCAG 2.4.11: the sticky header must not hide the focused element completely.
    const header = document.querySelector("header")?.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    const covered = () => {
      const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return !top || !target.contains(top);
    };
    const hidden = !!header && !target.closest("header") && rect.bottom <= header.bottom && covered();
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth), hidden };
  });
  expect(outline, `something is focused ${context}`).not.toBeNull();
  expect(outline!.style, `focus ring ${context}`).not.toBe("none");
  expect(outline!.width, `focus ring ${context}`).toBeGreaterThanOrEqual(2);
  expect(outline!.hidden, `focus hidden under the header ${context}`).toBe(false);
}
