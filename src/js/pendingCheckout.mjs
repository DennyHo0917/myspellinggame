const KEY = "mySpellingPendingCheckout";
const TTL = 15 * 60 * 1000;

export function clearPendingCheckout() {
  try {
    for (const key of [
      KEY,
      "pendingCheckoutPlan",
      "pendingCheckoutInterval",
      "pendingCheckoutLocale",
      "pendingCheckoutRetryRequired",
    ])
      sessionStorage.removeItem(key);
  } catch {}
}

export function readPendingCheckout() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    const age = Date.now() - value?.at;
    if (
      value &&
      ["parent", "teacher"].includes(value.plan) &&
      ["month", "year"].includes(value.interval) &&
      Number.isFinite(age) &&
      age >= 0 &&
      age < TTL
    )
      return value;
  } catch {}
  clearPendingCheckout();
  return null;
}

export function savePendingCheckout(plan, interval, auto = false) {
  if (
    !["parent", "teacher"].includes(plan) ||
    !["month", "year"].includes(interval)
  )
    return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ plan, interval, auto, at: Date.now() }),
    );
    sessionStorage.setItem("pendingCheckoutPlan", plan);
    sessionStorage.setItem("pendingCheckoutInterval", interval);
  } catch {}
}

// Consume before requesting Checkout: refresh and failed requests must never auto-retry.
export function consumePendingCheckout() {
  const value = readPendingCheckout();
  if (!value?.auto) return null;
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...value, auto: false }));
  } catch {
    return null;
  }
  return value;
}
