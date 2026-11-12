import { readPendingCheckout } from "./pendingCheckout.mjs";

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
  return null;
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
    interval:
      account?.billingInterval === "year" ||
      account?.billingInterval === "month"
        ? account.billingInterval
        : "month",
  };
}
