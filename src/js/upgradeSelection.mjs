// Keep an explicit checkout choice; otherwise recommend the workspace plan annually.
export function upgradeSelection(account) {
  try {
    const plan = sessionStorage.getItem("pendingCheckoutPlan");
    const interval = sessionStorage.getItem("pendingCheckoutInterval");
    if (
      ["parent", "teacher"].includes(plan) &&
      ["month", "year"].includes(interval)
    )
      return { plan, interval };
  } catch {}
  return {
    plan: account?.workspaceType === "teacher" ? "teacher" : "parent",
    interval: "year",
  };
}
