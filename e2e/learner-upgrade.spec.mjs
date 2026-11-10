import { test, expect } from "./fixtures.mjs";
import { productMessages } from "../src/js/productLocale.mjs";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
  test(`${locale} workspace upgrades offer one link to choose a plan`, async ({
    page,
  }) => {
    const copy = productMessages(locale);
    let workspaceType = null;
    await page.route("**/api/me", (route) =>
      route.fulfill({
        json: {
          user: { id: "free-adult", name: "Adult" },
          plan: "free",
          workspaceType,
          limits: PLAN_LIMITS.free,
        },
      }),
    );
    await page.route("**/api/assignments*", (route) =>
      route.fulfill({
        json: {
          assignments: [
            {
              id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
              title: "Weekly words",
              status: "published",
              locked_result_count: 3,
              expires_at: "2027-01-01T00:00:00Z",
            },
          ],
          savedLists: [],
          learners: [
            {
              id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
              name: "Alex",
              archived: 0,
            },
          ],
          usage: {
            limits: PLAN_LIMITS.free,
            learnerProfiles: 1,
            monthlyAttempts: 1,
            trackingTrialUsed: true,
            lockedResultCount: 3,
          },
        },
      }),
    );
    for (const type of [null, "family", "teacher"]) {
      workspaceType = type;
      await page.goto(`/workspace/learners?lang=${locale}`);
      const notice = page.locator(".waiting-learners-notice");
      const button = notice.getByRole("link");
      await expect(button).toHaveCount(1);
      await expect(button).toHaveText(copy.upgradeLearners);
      const href = new URL(await button.getAttribute("href"), page.url());
      expect(href.pathname).toBe(
        locale === "en" ? "/pricing" : `/${locale.toLowerCase()}/pricing`,
      );
      expect(href.searchParams.get("from")).toBe("waiting_list");
      expect(href.searchParams.has("plan")).toBe(false);
      expect(href.searchParams.has("interval")).toBe(false);
      await expect(notice.locator("small")).toHaveCount(0);
      await expect(notice).not.toContainText(
        /14[.,]99|7[.,]99|149[.,]90|79[.,]90/,
      );
      await page.setViewportSize({ width: 360, height: 850 });
      expect(
        await button.evaluate((el) => el.scrollWidth <= el.clientWidth),
      ).toBe(true);
      if (type === null)
        await page.screenshot({
          path: `test-results/learner-upgrade-${locale}.png`,
          fullPage: true,
          animations: "disabled",
        });
      await button.evaluate((el) =>
        el.addEventListener("click", (event) => event.preventDefault()),
      );
      await button.click();
      expect(
        await page.evaluate(
          () =>
            (window.dataLayer || [])
              .map((e) => Array.from(e))
              .filter((e) => e[1] === "upgrade_click")
              .at(-1)?.[2],
        ),
      ).toMatchObject({
        source: "waiting_list",
      });
      await page.goto(`/workspace?lang=${locale}`);
      for (const selector of [
        ".free-tracking-card",
        ".locked-results-notice",
      ]) {
        const prompt = page.locator(selector).first();
        await expect(prompt).toBeVisible();
        const upgrade = prompt.getByRole("link", {
          name:
            selector === ".free-tracking-card"
              ? copy.upgradeTracking
              : copy.upgradeResults,
          exact: true,
        });
        await expect(upgrade).toHaveCount(1);
        await expect(prompt).not.toContainText(
          /14[.,]99|7[.,]99|149[.,]90|79[.,]90/,
        );
        const target = new URL(await upgrade.getAttribute("href"), page.url());
        expect(target.searchParams.has("plan")).toBe(false);
        expect(target.searchParams.has("interval")).toBe(false);
        expect(
          await upgrade.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
        expect(
          await upgrade.evaluate((el) => {
            const range = document.createRange();
            range.selectNodeContents(el);
            return range.getClientRects().length;
          }),
        ).toBe(1);
      }
      if (type === null)
        await page.screenshot({
          path: `test-results/overview-upgrade-${locale}.png`,
          fullPage: true,
        });
    }
  });
}
