import { test, expect } from "./fixtures.mjs";

const locales = [
  ["", "First 4 full results", "5 active assignments", "10 active assignments"],
  [
    "es",
    "Primeros 4 resultados completos",
    "5 tareas activas",
    "10 tareas activas",
  ],
  [
    "pt-br",
    "Primeiros 4 resultados completos",
    "5 tarefas ativas",
    "10 tarefas ativas",
  ],
  [
    "fr",
    "4 premiers résultats complets",
    "5 devoirs actifs",
    "10 devoirs actifs",
  ],
  ["id", "4 hasil lengkap pertama", "5 tugas aktif", "10 tugas aktif"],
  [
    "zh",
    "每账号每月前 4 份完整结果",
    "最多 5 个活跃作业",
    "最多 10 个活跃作业",
  ],
];

for (const width of [1280, 390]) {
  for (const [locale, free, parent, teacher] of locales) {
    test(`${locale || "en"} pricing limits match the backend at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript((locale) => {
        localStorage.setItem("mySpellingGameManualLocale", locale);
      }, locale || "en");
      await page.route("**/api/me", (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({ error: "sign_in_required" }),
        }),
      );
      await page.goto(
        `${locale ? `/${locale}` : ""}/pricing?lang=${locale || "en"}`,
      );
      const cards = page.locator(".pricing-card");
      await expect(cards).toHaveCount(3);
      await expect(cards.nth(0)).toContainText(free);
      await expect(cards.nth(1)).toContainText(parent);
      await expect(cards.nth(2)).toContainText(teacher);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      if (
        (locale === "zh" && width === 390) ||
        (locale === "" && width === 1280)
      )
        await page.screenshot({
          path: `test-results/plan-limits-${locale || "en"}-${width}.png`,
          fullPage: true,
        });
    });
  }
}
