import { readPendingCheckout } from "./pendingCheckout.mjs";
// Keep an explicit checkout choice; otherwise recommend monthly billing by default.
export function upgradeSelection(account) {
  const pending = readPendingCheckout();
  if (pending) return { plan: pending.plan, interval: pending.interval };
  return {
    plan: account?.workspaceType === "teacher" ? "teacher" : "parent",
    interval:
      account?.billingInterval === "year" || account?.billingInterval === "month"
        ? account.billingInterval
        : "month",
  };
}
