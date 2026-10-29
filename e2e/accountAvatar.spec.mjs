import { readFile } from "node:fs/promises";
import { expect, test } from "./fixtures.mjs";
import { PLAN_LIMITS } from "../src/worker/domain.ts";

const photo = await readFile("images/avatars/avatar-01.jpg");
const googlePhoto = "https://lh3.googleusercontent.com/test-avatar";
const microsoftPhoto = `data:image/jpeg;base64, ${photo.toString("base64")}`;

async function signedIn(page, image) {
  await page.route("**/api/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: {
          id: "avatar-user",
          name: "Denny Ho",
          email: "avatar@example.test",
          image,
        },
        plan: "free",
        workspaceType: "family",
      }),
    }),
  );
  await page.route("**/api/assignments", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        assignments: [],
        learners: [],
        savedLists: [],
        usage: {
          limits: PLAN_LIMITS.free,
          activeAssignments: 0,
          monthlyAttempts: 0,
          lockedResultCount: 0,
          savedLists: 0,
          learnerProfiles: 0,
        },
      }),
    }),
  );
  await page.route("**/api/lifecycle/**", (route) =>
    route.fulfill({ contentType: "application/json", body: '{"ok":true}' }),
  );
  await page.route(googlePhoto, (route) =>
    route.fulfill({ contentType: "image/jpeg", body: photo }),
  );
}

for (const [surface, path] of [
  ["home", "/"],
  ["workspace", "/workspace?lang=zh"],
]) {
  for (const [provider, image] of [
    ["Google", googlePhoto],
    ["Microsoft", microsoftPhoto],
  ]) {
    test(`${surface} displays the ${provider} avatar without changing the account menu on mobile`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await signedIn(page, image);
      await page.goto(path);
      if (surface === "workspace")
        await expect(page.locator(".teacher-dashboard-card h1")).toBeVisible();
      else await expect(page.locator("html")).toHaveAttribute("lang", "en");
      const toggle = page.locator(".workspace-user-toggle");
      await expect(toggle).toContainText("Denny Ho");
      const avatar = toggle.locator(".workspace-user-avatar img");
      await expect(avatar).toBeVisible();
      expect(await avatar.evaluate((img) => img.naturalWidth)).toBeGreaterThan(
        0,
      );
      const box = await avatar.boundingBox();
      expect(box.width).toBe(30);
      expect(box.height).toBe(30);
      await toggle.click();
      await expect(page.locator(".workspace-user-email")).toHaveText(
        "avatar@example.test",
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: `test-results/avatar-${surface}-${provider}.png`,
      });
    });
  }
  for (const state of ["missing", "broken"]) {
    test(`${surface} falls back to the initial when the provider avatar is ${state}`, async ({
      page,
    }) => {
      await signedIn(page, state === "missing" ? null : googlePhoto);
      if (state === "broken")
        await page.route(googlePhoto, (route) => route.abort());
      await page.goto(path);
      const avatar = page.locator(".workspace-user-avatar");
      await expect(avatar).toHaveText("D");
      await expect(avatar.locator("img")).toHaveCount(0);
      await expect(page.locator(".workspace-user-toggle")).toContainText(
        "Denny Ho",
      );
    });
  }
}
