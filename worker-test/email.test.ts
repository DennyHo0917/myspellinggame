import { describe, expect, it, vi } from "vitest";
import {
  buildWelcomeEmail,
  buildPriceChangeEmail,
  resolveWelcomeLocale,
  sendWelcomeEmail,
} from "../src/worker/email";

describe("welcome email", () => {
  it("keeps the logo and start URL in both email formats", () => {
    const email = buildWelcomeEmail("en-US,en;q=0.9");
    expect(email.from).toBe("MySpellingGame <hello@myspellinggame.com>");
    expect(email.html).toContain(
      'src="https://myspellinggame.com/images/icon-64.png"',
    );
    expect(email.html).toContain(">My Spelling Game</a>");
    expect(email.html).toContain('href="https://myspellinggame.com/"');
    expect(email.text).toContain("Start here:\nhttps://myspellinggame.com/");
  });

  it("uses a supported browser language and falls back to English", () => {
    expect(resolveWelcomeLocale("fr-FR,fr;q=0.9")).toBe("fr");
    expect(resolveWelcomeLocale("zh-TW,zh;q=0.9")).toBe("zh-CN");
    expect(resolveWelcomeLocale("de-DE")).toBe("en");
  });

  it("posts the fixed template to Resend", async () => {
    const fetchEmail = vi.fn(async (_url: string, _init: RequestInit) =>
      Response.json({ id: "email-id" }, { status: 200 }),
    );
    await expect(
      sendWelcomeEmail("secret", "user@example.com", "en", fetchEmail),
    ).resolves.toEqual({ id: "email-id" });
    const [url, init] = fetchEmail.mock.calls[0];
    const body = JSON.parse(String(init.body));
    expect(url).toBe("https://api.resend.com/emails");
    expect(body.to).toEqual(["user@example.com"]);
    expect(body.subject).toBe("Welcome to MySpellingGame");
  });
});

describe("price change email", () => {
  it.each([
    ["en-US", "", "7.99"],
    ["es", "/es", "7,99"],
    ["pt-BR", "/pt-br", "7,99"],
    ["fr", "/fr", "7,99"],
    ["id", "/id", "7,99"],
    ["zh-CN", "/zh", "7.99"],
  ])(
    "includes the price, renewal time, and cancellation link in %s",
    (locale, prefix, amount) => {
      const email = buildPriceChangeEmail("2026-10-18T22:06:19.000Z", locale);
      expect(email.text).toContain(amount);
      expect(email.text).toContain("2026");
      expect(email.text).toMatch(/22[:.]06[:.]19/);
      expect(email.text).toContain("(UTC)");
      expect(email.html).toContain(
        `href="https://myspellinggame.com${prefix}/pricing"`,
      );
      expect(email.reply_to).toBe("dennyho0917@hotmail.com");
      expect(email.text).not.toContain("{date}");
      expect(email.html).not.toContain("{date}");
    },
  );

  it("rejects an invalid renewal time before sending", () => {
    expect(() => buildPriceChangeEmail("unknown", "en")).toThrow(
      "Invalid renewal date",
    );
  });
});
