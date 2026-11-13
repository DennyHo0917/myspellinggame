import { readPendingCheckout } from "./pendingCheckout.mjs";

// Photo Import, Smart Review, and Auto-fill share one upgrade path.
// Classroom tools still lead with Teacher.
export const TRIAL_UPGRADE_SOURCES = new Set([
  "photo_import",
  "smart_review",
  "example_sentences",
  "sentence_library",
  "sentence_library_required",
  "feature_trial_expired",
]);

// URL plan/interval wins. A plan without an interval stays on the monthly default.
export function pricingQuerySelection(params) {
  const planParam = params.get("plan");
  const intervalParam = params.get("interval");
  const plan = ["parent", "teacher"].includes(planParam) ? planParam : null;
  const interval = ["month", "year"].includes(intervalParam)
    ? intervalParam
    : null;
  if (plan && interval) return { plan, interval };
  if (params.get("from") === "classroom_lock")
    return { plan: "teacher", interval: interval || "month" };
  if (interval) return { plan: plan || "parent", interval };
  if (plan) return { plan, interval: "month" };
  if (TRIAL_UPGRADE_SOURCES.has(params.get("from") || ""))
    return { plan: "parent", interval: "month" };
  return null;
}

function billingInterval(account) {
  return account?.billingInterval === "year" ||
    account?.billingInterval === "month"
    ? account.billingInterval
    : "month";
}

// Trial features lead with Parent. An explicit saved choice still wins,
// and a Parent subscriber's next step remains Teacher.
export function trialUpgradeSelection(account) {
  const pending = readPendingCheckout();
  if (pending) return { plan: pending.plan, interval: pending.interval };
  if (account?.plan === "parent")
    return { plan: "teacher", interval: billingInterval(account) };
  return { plan: "parent", interval: billingInterval(account) };
}

// Keep an explicit checkout choice; otherwise recommend monthly billing by default.
export function upgradeSelection(account) {
  const pending = readPendingCheckout();
  if (pending) return { plan: pending.plan, interval: pending.interval };
  const targetPlan =
    account?.plan === "parent"
      ? "teacher"
      : account?.workspaceType === "teacher"
        ? "teacher"
        : "parent";
  return {
    plan: targetPlan,
    interval: billingInterval(account),
  };
}
