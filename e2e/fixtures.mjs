import { test as base, expect } from "@playwright/test";
// Exercise the local app without sending analytics or contacting production services.
// Individual test routes can still supply deterministic external-script fixtures.
export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route("**/*", (route) => {
      const url = new URL(route.request().url());
      return ["127.0.0.1", "localhost"].includes(url.hostname)
        ? route.continue()
        : route.abort();
    });
    await use(context);
  },
});
export { expect };
