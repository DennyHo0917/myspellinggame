const KEY = "mySpellingTrackingEntry";
export function saveTrackingEntry(draft, userId = null) {
  try {
    sessionStorage.setItem(
      KEY,
      JSON.stringify({ ...draft, userId, createdAt: Date.now() }),
    );
  } catch {}
}
function storedTrackingEntry(userId) {
  const value = JSON.parse(sessionStorage.getItem(KEY));
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
}
export function readTrackingEntry(userId) {
  try {
    return storedTrackingEntry(userId);
  } catch {
    return null;
  }
}
export function takeTrackingEntry(userId) {
  try {
    const value = storedTrackingEntry(userId);
    sessionStorage.removeItem(KEY);
    return value;
  } catch {
    return null;
  }
}
