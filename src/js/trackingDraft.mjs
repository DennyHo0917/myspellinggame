const KEY = "mySpellingTrackingEntry";
export function saveTrackingEntry(draft, userId = null) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, userId, createdAt: Date.now() }),
    );
  } catch {}
}
export function takeTrackingEntry(userId) {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY));
    sessionStorage.removeItem(KEY);
    if (
      !value ||
      typeof value.words !== "string" ||
      !Number.isFinite(value.createdAt) ||
      Date.now() - value.createdAt > 86400000 ||
      value.createdAt > Date.now() ||
      (value.userId && value.userId !== userId)
    )
      return null;
    return value;
  } catch {
    return null;
  }
}
