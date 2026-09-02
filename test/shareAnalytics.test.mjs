import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanPageLocation,
  getAssignmentEntryPoint,
  initReturnVisit,
  sanitizeEventParams,
  setAssignmentEntryPoint,
  trackCheckoutCancelled,
  trackLockedFeature,
  trackLockedFeatureError,
  trackUsageLimit,
} from "../src/js/analytics.mjs";
import { launcherUrl } from "../src/js/landingLauncher.mjs";
import { buildShareHash, readShareState } from "../src/js/shareState.mjs";

test("new share links use a hash and restore their mode", () => {
  const hash = buildShareHash(["because", "friend"], "dictation");
  assert.match(hash, /^#data=/);
  assert.equal(hash.includes("because"), false);
  assert.equal(hash.includes("?"), false);
  assert.deepEqual(readShareState({ hash, search: "" }), {
    words: "because,friend",
    mode: "dictation",
    exampleSentences: "",
    autoStart: false,
    entryPage: "",
    sharedLink: true,
    source: "hash",
  });
});

test("share links preserve example sentences and blank lines by word order", () => {
  const hash = buildShareHash(["because", "friend", "school"], "dictation", {
    exampleSentences: "I stayed inside because it rained.\n\nAt school today.",
  });
  const state = readShareState({ hash, search: "" });
  assert.equal(hash.includes("because"), false);
  assert.equal(hash.includes("I+stayed"), false);
  assert.equal(
    state.exampleSentences,
    "I stayed inside because it rained.\n\nAt school today.",
  );
});

test("large share links compress repeated words and sentences", () => {
  const words = Array.from({ length: 20 }, (_, index) => `word${index % 5}`);
  const exampleSentences = words
    .map((word) => `I practiced ${word} at school yesterday.`)
    .join("\n");
  const hash = buildShareHash(words, "dictation", { exampleSentences });
  const rawJson = JSON.stringify({
    words: words.join(","),
    mode: "dictation",
    exampleSentences,
    autoStart: false,
    entryPage: "",
  });
  assert.match(hash, /^#data=z\./);
  assert.ok(
    hash.length < Math.ceil((new TextEncoder().encode(rawJson).length * 4) / 3),
  );
  assert.deepEqual(readShareState({ hash, search: "" }).words, words.join(","));
  assert.deepEqual(
    readShareState({ hash, search: "" }).exampleSentences,
    exampleSentences,
  );
});

test("legacy hash shares with plain words and sentences remain readable", () => {
  const state = readShareState({
    hash: "#words=red,blue&mode=dictation&sentences=Red%20one.%0ABlue%20two.",
    search: "",
  });
  assert.equal(state.words, "red,blue");
  assert.equal(state.exampleSentences, "Red one.\nBlue two.");
});

test("legacy query shares still load and default to Typing Rain", () => {
  const state = readShareState({ search: "?words=red,blue", hash: "" });
  assert.equal(state.words, "red,blue");
  assert.equal(state.mode, "typing");
  assert.equal(state.source, "query");
});

test("landing launchers preserve the selected mode and autostart", () => {
  const url = new URL(
    launcherUrl("/fr/", " Apple\napple\nbanana ", "typing", "/fr/"),
  );
  const state = readShareState(url);
  assert.equal(url.pathname, "/fr/");
  assert.equal(state.words, "apple,banana");
  assert.equal(state.mode, "typing");
  assert.equal(state.autoStart, true);
  assert.equal(state.entryPage, "/fr/");
});

test("GA page location strips query strings and fragments", () => {
  assert.equal(
    cleanPageLocation(
      "https://myspellinggame.com/zh/?words=secret#words=private",
    ),
    "https://myspellinggame.com/zh/",
  );
});

test("analytics allowlists omit raw words and typed answers", () => {
  assert.deepEqual(
    sanitizeEventParams("word_completed", {
      mode: "dictation",
      word_length: 7,
      correct: true,
      word: "because",
      answer: "becuase",
      words: ["because"],
    }),
    { mode: "dictation", word_length: 7, correct: true },
  );
});

test("commercial funnel analytics keep their dimensions and omit PII", () => {
  const pii = {
    email: "teacher@example.test",
    name: "Teacher A",
    word: "because",
    words: ["because"],
  };
  assert.deepEqual(
    sanitizeEventParams("word_limit_hit", {
      ...pii,
      limit: 30,
      account_tier: "free",
      word_count_range: "31-80",
      action: "spelling_test",
    }),
    {
      limit: 30,
      account_tier: "free",
      word_count_range: "31-80",
      action: "spelling_test",
    },
  );
  for (const event of [
    "upgrade_clicked",
    "checkout_started",
    "checkout_redirected",
    "subscription_started",
  ]) {
    assert.deepEqual(
      sanitizeEventParams(event, {
        ...pii,
        plan: "parent",
        billing_interval: "year",
      }),
      { plan: "parent", billing_interval: "year" },
    );
  }
  assert.deepEqual(
    sanitizeEventParams("purchase", {
      ...pii,
      plan: "teacher",
      billing_interval: "month",
      value: 9.99,
      currency: "USD",
    }),
    {
      plan: "teacher",
      billing_interval: "month",
      value: 9.99,
      currency: "USD",
    },
  );
  assert.deepEqual(
    sanitizeEventParams("sign_up", {
      ...pii,
      provider: "google",
      workspace_type: "teacher",
    }),
    { provider: "google", workspace_type: "teacher" },
  );
  assert.deepEqual(
    sanitizeEventParams("locked_feature_attempted", {
      ...pii,
      feature: "photo_import",
      current_plan: "free",
    }),
    { feature: "photo_import", current_plan: "free" },
  );
  assert.deepEqual(
    sanitizeEventParams("checkout_failed", {
      ...pii,
      plan: "parent",
      billing_interval: "year",
      error_code: "checkout_pending",
    }),
    {
      plan: "parent",
      billing_interval: "year",
      error_code: "checkout_pending",
    },
  );
  assert.deepEqual(sanitizeEventParams("learner_created", pii), {});
  assert.deepEqual(sanitizeEventParams("saved_list_created", pii), {});
});

test("signup CTA analytics keep only conversion funnel fields", () => {
  assert.deepEqual(
    sanitizeEventParams("signup_cta_viewed", {
      mode: "dictation",
      word_count: 10,
      missed_count: 3,
      replay_round: false,
      cta_location: "practice_result",
      words: ["because"],
    }),
    {
      mode: "dictation",
      word_count: 10,
      missed_count: 3,
      replay_round: false,
      cta_location: "practice_result",
    },
  );
});

test("practice share analytics keep only chooser and anonymous-share fields", () => {
  assert.deepEqual(
    sanitizeEventParams("practice_share_options_viewed", {
      mode: "typing",
      word_count: 8,
      locale: "en",
      words: ["because"],
    }),
    { mode: "typing", word_count: 8, locale: "en" },
  );
  assert.deepEqual(
    sanitizeEventParams("practice_link_copied", {
      mode: "typing",
      word_count: 8,
      locale: "en",
      share_type: "practice_only",
      words: ["because"],
    }),
    {
      mode: "typing",
      word_count: 8,
      locale: "en",
      share_type: "practice_only",
    },
  );
});

test("Typing Chase analytics keep only aggregate gameplay fields", () => {
  assert.deepEqual(
    sanitizeEventParams("typing_chase_completed", {
      chase_mode: "hard",
      outcome: "caught",
      wpm_range: "45_59",
      accuracy_range: "95_99",
      duration_range: "60_119",
      locale: "en",
      passage: "private passage text",
      typed_input: "private input",
    }),
    {
      chase_mode: "hard",
      outcome: "caught",
      wpm_range: "45_59",
      accuracy_range: "95_99",
      duration_range: "60_119",
      locale: "en",
    },
  );
});

test("teacher analytics omit student, assignment, and Stripe identifiers", () => {
  const privateValues = {
    nickname: "Student 01",
    word: "because",
    words: ["because"],
    answer: "becuase",
    assignment_id: "assignment-secret",
    public_id: "public-secret",
    stripe_id: "sub_secret",
  };
  const expected = {
    mode: "typing",
    word_count: 8,
    accuracy_range: "90-100",
    duration_range: "1-3m",
  };
  assert.deepEqual(
    sanitizeEventParams("assignment_completed", {
      ...privateValues,
      ...expected,
    }),
    expected,
  );
  assert.deepEqual(
    sanitizeEventParams("checkout_started", {
      ...privateValues,
      plan: "teacher",
      billing_interval: "year",
    }),
    { plan: "teacher", billing_interval: "year" },
  );
  assert.deepEqual(
    sanitizeEventParams("checkout_redirected", {
      ...privateValues,
      plan: "teacher",
      billing_interval: "year",
    }),
    { plan: "teacher", billing_interval: "year" },
  );
  assert.deepEqual(
    sanitizeEventParams("assignment_entry_clicked", {
      ...privateValues,
      mode: "typing",
      word_count: 8,
      entry_point: "copy_track",
    }),
    { mode: "typing", word_count: 8, entry_point: "copy_track" },
  );
  assert.deepEqual(
    sanitizeEventParams("teacher_auth_started", {
      ...privateValues,
      entry_point: "copy_track",
    }),
    { entry_point: "copy_track" },
  );
  assert.deepEqual(
    sanitizeEventParams("teacher_auth_completed", {
      ...privateValues,
      entry_point: "copy_track",
    }),
    { entry_point: "copy_track" },
  );
  assert.deepEqual(
    sanitizeEventParams("assignment_created", {
      ...privateValues,
      mode: "typing",
      word_count: 8,
      entry_point: "copy_track",
    }),
    { mode: "typing", word_count: 8, entry_point: "copy_track" },
  );
  assert.deepEqual(
    sanitizeEventParams("usage_limit_reached", {
      ...privateValues,
      limit_type: "monthly_submissions",
    }),
    { limit_type: "monthly_submissions" },
  );
  assert.deepEqual(
    sanitizeEventParams("upgrade_clicked", {
      ...privateValues,
      plan: "teacher",
      billing_interval: "month",
    }),
    { plan: "teacher", billing_interval: "month" },
  );
  assert.deepEqual(
    sanitizeEventParams("upgrade_cta_clicked", {
      ...privateValues,
      cta_location: "smart_review",
    }),
    { cta_location: "smart_review" },
  );
  assert.deepEqual(
    sanitizeEventParams("purchase", {
      ...privateValues,
      plan: "teacher",
      billing_interval: "year",
      value: 49.99,
      currency: "USD",
    }),
    {
      plan: "teacher",
      billing_interval: "year",
      value: 49.99,
      currency: "USD",
    },
  );
  assert.deepEqual(
    sanitizeEventParams("teacher_auth_completed", privateValues),
    {},
  );
});

test("assignment entry points accept only the fixed funnel sources", () => {
  const values = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  try {
    for (const source of [
      "copy_track",
      "assign_homework",
      "practice_result",
      "workspace",
    ]) {
      assert.equal(setAssignmentEntryPoint(source), true);
      assert.equal(getAssignmentEntryPoint(), source);
    }
    assert.equal(setAssignmentEntryPoint("email@example.test"), false);
    values.set("mySpellingAssignmentEntryPoint", "email@example.test");
    assert.equal(getAssignmentEntryPoint(), null);
    globalThis.sessionStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    assert.equal(setAssignmentEntryPoint("workspace"), false);
    assert.equal(getAssignmentEntryPoint(), null);
  } finally {
    delete globalThis.sessionStorage;
  }
});

test("usage limits report a known type at most once per page", () => {
  const events = [];
  globalThis.window = { gtag: (...args) => events.push(args) };
  try {
    trackUsageLimit("monthly_submission_limit");
    trackUsageLimit("monthly_submission_limit");
    trackUsageLimit("attempt_limit");
    trackUsageLimit("saved_list_limit");
    trackUsageLimit("learner_limit");
    assert.deepEqual(events, [
      ["event", "usage_limit_reached", { limit_type: "monthly_submissions" }],
      ["event", "usage_limit_reached", { limit_type: "saved_lists" }],
      ["event", "usage_limit_reached", { limit_type: "learner_profiles" }],
    ]);
  } finally {
    delete globalThis.window;
  }
});

test("locked features and Checkout cancellation report once", () => {
  const events = [];
  globalThis.window = { gtag: (...args) => events.push(args) };
  try {
    trackLockedFeature("photo_import", "free");
    trackLockedFeature("photo_import", "free");
    trackLockedFeatureError("saved_list_limit", "free");
    trackLockedFeatureError("not_a_paywall", "free");
    trackCheckoutCancelled("parent", "year");
    trackCheckoutCancelled("parent", "year");
    assert.deepEqual(events, [
      [
        "event",
        "locked_feature_attempted",
        { feature: "photo_import", current_plan: "free" },
      ],
      [
        "event",
        "locked_feature_attempted",
        { feature: "saved_list_limit", current_plan: "free" },
      ],
      [
        "event",
        "checkout_cancelled",
        { plan: "parent", billing_interval: "year" },
      ],
    ]);
  } finally {
    delete globalThis.window;
  }
});

test("return visits are emitted at most once per session", () => {
  const local = new Map([
    [
      "mySpellingGameVisitHistory",
      JSON.stringify({ lastVisit: 1000, count: 2 }),
    ],
  ]);
  const session = new Map();
  const events = [];
  globalThis.window = { gtag: (...args) => events.push(args) };
  globalThis.localStorage = {
    getItem: (key) => local.get(key) || null,
    setItem: (key, value) => local.set(key, value),
  };
  globalThis.sessionStorage = {
    getItem: (key) => session.get(key) || null,
    setItem: (key, value) => session.set(key, value),
  };

  try {
    initReturnVisit(86401000);
    initReturnVisit(172801000);
    assert.deepEqual(events, [
      [
        "event",
        "return_visit",
        {
          days_since_last_visit: 1,
          visit_count_range: "3-5",
        },
      ],
    ]);
  } finally {
    delete globalThis.window;
    delete globalThis.localStorage;
    delete globalThis.sessionStorage;
  }
});
