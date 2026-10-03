import { test, expect } from "./fixtures.mjs";

const json = (route, body, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });

const user = {
  id: "subscriber",
  name: "订阅用户",
  email: "subscriber@example.test",
  loginProvider: "google",
  plan: "parent",
  adminPlan: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  lastActiveAt: "2026-10-03T00:00:00.000Z",
  subscriptionStartedAt: "2026-09-29T22:00:45.000Z",
  currentPeriodEnd: "2026-10-29T22:00:45.000Z",
  subscriptionStatus: "active",
  billingInterval: "month",
  cancelAtPeriodEnd: false,
  cancelAt: null,
  endedAt: null,
};

test.beforeEach(async ({ page }) => {
  await page.route("**/api/admin/stats", (route) =>
    json(route, {
      totalUsers: 4,
      proUsers: 3,
      todayUsers: 0,
      last7DaysUsers: 1,
      googleUsers: 4,
      microsoftUsers: 0,
      monthlyUsers: 3,
      yearlyUsers: 0,
    }),
  );
  await page.route("**/api/admin/users?**", (route) =>
    json(route, {
      users: [user],
      total: 1,
      page: 1,
      pageSize: 50,
    }),
  );
  await page.route("**/api/admin/orders?**", (route) =>
    json(route, {
      orders: [],
      total: 0,
      page: 1,
      pageSize: 50,
    }),
  );
});

for (const width of [1440, 390]) {
  test(`subscription table retains base columns and shows cancellation accurately at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    const requests = [];
    await page.route("**/api/admin/subscriptions?**", (route) => {
      requests.push(route.request().url());
      return json(route, {
        users: [
          { ...user, cancelAt: user.currentPeriodEnd },
          { ...user, id: "renewing", name: "正常续费用户" },
          {
            ...user,
            id: "ended",
            name: "已结束用户",
            plan: "free",
            subscriptionStatus: "canceled",
            endedAt: "2026-09-25T15:16:27.000Z",
          },
          {
            ...user,
            id: "period-cancel",
            name: "周期末取消",
            cancelAtPeriodEnd: true,
          },
        ],
        total: 4,
        page: 1,
        pageSize: 50,
      });
    });
    await page.goto("/admin");
    await expect(page.locator("#admin-users")).toContainText(user.email);
    expect(requests).toHaveLength(0);
    const baseColumns = await page
      .locator("#admin-users-panel th")
      .allTextContents();
    await page.getByRole("tab", { name: "订阅用户" }).click();
    const panel = page.locator("#admin-subscriptions-panel");
    await expect(panel).toBeVisible();
    await expect(page.locator("#admin-users-panel")).toBeHidden();
    await expect(page.locator("#admin-orders-panel")).toBeHidden();
    const columns = await panel.locator("th").allTextContents();
    expect(columns).toEqual([
      ...baseColumns.slice(0, -1),
      "订阅时间",
      "到期时间",
      "订阅状态",
      "是否取消续费",
      "操作",
    ]);
    const rows = panel.locator("tbody tr");
    await expect(rows).toHaveCount(4);
    await expect(rows.nth(0)).toContainText("2026/09/30 06:00");
    await expect(rows.nth(0)).toContainText("2026/10/30 06:00");
    await expect(rows.nth(0)).toContainText("生效中");
    await expect(rows.nth(0)).toContainText("已取消续费");
    await expect(rows.nth(1)).toContainText("未取消");
    await expect(rows.nth(2)).toContainText("2026/09/25 23:16");
    await expect(rows.nth(2)).toContainText("已取消");
    await expect(rows.nth(3)).toContainText("已取消续费");
    await page.screenshot({
      path: `test-results/admin-subscriptions-${width}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const table = panel.locator(".table-wrap");
    if (width < 768)
      expect(
        await table.evaluate(
          (element) => element.scrollWidth > element.clientWidth,
        ),
      ).toBe(true);
    await rows.nth(0).getByRole("button", { name: "查看详情" }).click();
    const drawer = page.locator("#admin-user-drawer");
    await expect(drawer).toContainText("订阅时间（北京时间）");
    await expect(drawer).toContainText("已取消续费");
    await page.getByRole("button", { name: "关闭用户详情" }).click();
    await page.getByRole("button", { name: "刷新", exact: true }).click();
    await expect.poll(() => requests.length).toBe(2);
    await page.getByRole("tab", { name: "订单", exact: true }).click();
    await expect(page.locator("#admin-orders-panel")).toBeVisible();
    await expect(panel).toBeHidden();
    await page.getByRole("tab", { name: "订阅用户" }).click();
    expect(requests).toHaveLength(2);
  });
}

test("subscriber filters and pagination are independent of users and orders", async ({
  page,
}) => {
  const requests = [];
  await page.route("**/api/admin/subscriptions?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    requests.push(Object.fromEntries(params));
    return json(route, {
      users: [user],
      total: params.get("q") ? 1 : 51,
      page: Number(params.get("page")),
      pageSize: 50,
    });
  });
  await page.goto("/admin");
  await page.getByRole("tab", { name: "订阅用户" }).click();
  await expect(page.locator("#admin-subscriptions-next")).toBeEnabled();
  await page.locator("#admin-subscriptions-next").click();
  await expect(page.locator("#admin-subscriptions-page")).toContainText(
    "第 2 / 2 页",
  );
  await page.locator("#admin-subscriptions-previous").click();
  await expect(page.locator("#admin-subscriptions-page")).toContainText(
    "第 1 / 2 页",
  );
  await page
    .locator("#admin-subscription-query")
    .fill("subscriber@example.test");
  await page.locator("#admin-subscription-plan-filter").selectOption("parent");
  await page
    .locator("#admin-subscription-provider-filter")
    .selectOption("google");
  await page.locator("#admin-subscription-search button").click();
  await expect(page.locator("#admin-subscriptions-page")).toContainText(
    "共 1 位订阅用户",
  );
  expect(requests.at(-1)).toEqual({
    page: "1",
    q: user.email,
    plan: "parent",
    provider: "google",
  });
  await expect(page.locator("#admin-subscriptions-next")).toBeDisabled();
  await page.getByRole("tab", { name: "用户", exact: true }).click();
  await expect(page.locator("#admin-query")).toHaveValue("");
  await expect(page.locator("#admin-users")).toContainText(user.email);
});

test("subscriber view handles failed loads, retry, and empty results in Chinese", async ({
  page,
}) => {
  let requests = 0;
  await page.route("**/api/admin/subscriptions?**", (route) => {
    requests += 1;
    return requests === 1
      ? json(route, { error: "admin_forbidden" }, 403)
      : json(route, { users: [], total: 0, page: 1, pageSize: 50 });
  });
  await page.goto("/admin");
  await page.getByRole("tab", { name: "订阅用户" }).click();
  await expect(page.locator("#admin-subscriptions-status")).toHaveText(
    "当前账号没有管理后台访问权限。",
  );
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await expect(page.locator("#admin-subscriptions-status")).toHaveText(
    "没有找到订阅用户。",
  );
  await expect(page.locator("#admin-subscriptions-page")).toContainText(
    "共 0 位订阅用户",
  );
  await expect(page.locator("#admin-subscriptions-previous")).toBeDisabled();
  await expect(page.locator("#admin-subscriptions-next")).toBeDisabled();
});
