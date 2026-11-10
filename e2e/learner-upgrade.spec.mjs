import { test, expect } from "./fixtures.mjs";
import { productMessages } from "../src/js/productLocale.mjs";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

for (const locale of ["en", "es", "pt-BR", "fr", "id", "zh"]) {
  test(`${locale} learner upgrade recommends the matching plan and yearly price`, async ({
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
          assignments: [],
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
            monthlyAttempts: 0,
          },
        },
      }),
    );
    for (const type of [null, "family", "teacher"]) {
      workspaceType = type;
      const plan = type === "teacher" ? "teacher" : "parent";
      await page.goto(`/workspace/learners?lang=${locale}`);
      const notice = page.locator(".waiting-learners-notice");
      const button = notice.getByRole("link");
      await expect(button).toHaveText(copy[`${plan}UpgradePrice`]);
      await expect(button).toHaveAttribute(
        "href",
        new RegExp(`plan=${plan}&interval=month`),
      );
      await expect(notice.locator("small")).toHaveText(
        plan === "parent" ? copy.orParentYearly : copy.orTeacherYearly,
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
        plan,
        billing_interval: "month",
      });
    }
  });
}
