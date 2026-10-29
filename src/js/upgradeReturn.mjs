const KEY = "mySpellingUpgradeReturn";
const MAX_AGE = 24 * 60 * 60 * 1000;

export function safeUpgradePath(value, origin = location.origin) {
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    if (
      !/^(?:\/(?:en\/|es\/|pt-br\/|fr\/|id\/|zh\/)?|\/workspace(?:\/(?:assignments|learners|saved-lists|progress))?(?:\/(?:new|[0-9a-f-]{36})(?:\/edit)?)?)$/i.test(
        url.pathname,
      )
    )
      return null;
    const query = new URLSearchParams();
    for (const key of ["lang", "section", "tracking"]) {
      const value = url.searchParams.get(key);
      if (
        value &&
        (key === "tracking" ? value === "1" : /^[a-z-]+$/i.test(value))
      )
        query.set(key, value);
    }
    return url.pathname + (query.size ? `?${query}` : "");
  } catch {
    return null;
  }
}

export function readUpgradeReturn() {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    if (
      !value ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - value.createdAt > MAX_AGE ||
      value.createdAt > Date.now() ||
      !safeUpgradePath(value.path)
    )
      return null;
    return { ...value, path: safeUpgradePath(value.path) };
  } catch {
    return null;
  }
}

export function saveUpgradeReturn(feature, userId = null, draft = null) {
  const path = safeUpgradePath(location.href);
  if (!path) return;
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ path, feature, userId, draft, createdAt: Date.now() }),
    );
  } catch {}
}

export function bindUpgradeReturn(userId) {
  const value = readUpgradeReturn();
  if (!value || !userId) return;
  try {
    if (value.userId && value.userId !== userId) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify({ ...value, userId }));
  } catch {}
}

export function upgradeReturnFor(me) {
  const value = readUpgradeReturn();
  return value &&
    value.userId === me?.user?.id &&
    ["parent", "teacher"].includes(me?.plan)
    ? value
    : null;
}

export function clearUpgradeReturn() {
  try {
    sessionStorage.removeItem(KEY);
    sessionStorage.removeItem("pendingUpgradeFeature");
  } catch {}
}
