const KEY = "mySpellingAdultFirstTouch";
const SOURCES = [
  "direct",
  "google",
  "bing",
  "google_classroom",
  "chatgpt",
  "facebook",
  "instagram",
  "external_other",
];
const MEDIUMS = [
  "organic",
  "referral",
  "social",
  "email",
  "cpc",
  "ai_assistant",
];
const CAMPAIGNS = ["classroom_launch", "teacher_resources", "parent_resources"];
export function acquisitionAllowed() {
  return (
    typeof window !== "undefined" &&
    navigator.doNotTrack !== "1" &&
    !navigator.globalPrivacyControl &&
    !Object.keys(window).some(
      (key) => key.startsWith("ga-disable-") && window[key] === true,
    )
  );
}
export function sanitizeAcquisition(value = {}) {
  const source = ["chatgpt.com", "chat.openai.com"].includes(value.source)
    ? "chatgpt"
    : value.source;
  const medium =
    value.medium === "ai-assistant" ? "ai_assistant" : value.medium;
  return {
    source: SOURCES.includes(source) ? source : "direct",
    medium: MEDIUMS.includes(medium) ? medium : null,
    campaign: CAMPAIGNS.includes(value.campaign) ? value.campaign : null,
  };
}
export function classifyAcquisition(href, referrer = "") {
  const url = new URL(href);
  let source = "direct";
  let medium = null;
  try {
    const ref = new URL(referrer);
    if (ref.origin !== url.origin) {
      const host = ref.hostname;
      source = ["chatgpt.com", "www.chatgpt.com", "chat.openai.com"].includes(
        host,
      )
        ? "chatgpt"
        : host === "classroom.google.com"
          ? "google_classroom"
          : /(^|\.)google\.(?:com|[a-z]{2}|(?:com|co)\.[a-z]{2})$/.test(host)
            ? "google"
            : /(^|\.)bing.com$/.test(host)
              ? "bing"
              : /(^|\.)facebook.com$/.test(host)
                ? "facebook"
                : /(^|\.)instagram.com$/.test(host)
                  ? "instagram"
                  : "external_other";
      medium =
        source === "chatgpt"
          ? "ai_assistant"
          : ["google", "bing"].includes(source)
            ? "organic"
            : "referral";
    }
  } catch {}
  return sanitizeAcquisition({
    source:
      url.searchParams.get("acq_source") ||
      url.searchParams.get("utm_source") ||
      source,
    medium:
      url.searchParams.get("acq_medium") ||
      url.searchParams.get("utm_medium") ||
      medium,
    campaign:
      url.searchParams.get("acq_campaign") ||
      url.searchParams.get("utm_campaign"),
  });
}
export function clearAdultAcquisition() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}
// undefined means identity is not loaded; null means confirmed signed out.
export function captureAdultAcquisition(userId) {
  if (
    !acquisitionAllowed() ||
    /^\/(?:a|l|join)(?:\/|$)/.test(location.pathname) ||
    location.pathname === "/admin"
  )
    return null;
  const value = classifyAcquisition(location.href, document.referrer);
  try {
    const previous = JSON.parse(sessionStorage.getItem(KEY) || "null");
    const switchedAccount =
      userId !== undefined &&
      typeof previous?.userId === "string" &&
      previous.userId !== userId;
    const previousValue = previous ? sanitizeAcquisition(previous) : null;
    // An anonymous direct visit (including the logout landing page) must not
    // hide a subsequent external arrival before the next account signs in.
    const firstExternalArrival =
      !previous?.userId &&
      previousValue?.source === "direct" &&
      !previousValue.medium &&
      !previousValue.campaign &&
      (value.source !== "direct" || value.medium || value.campaign);
    const captured =
      previousValue && !switchedAccount && !firstExternalArrival
        ? previousValue
        : value;
    sessionStorage.setItem(
      KEY,
      JSON.stringify({
        ...captured,
        userId: userId === undefined ? (previous?.userId ?? null) : userId,
      }),
    );
    return captured;
  } catch {}
  return value;
}
export function acquisitionCallback(path) {
  const value = captureAdultAcquisition();
  if (!value || (value.source === "direct" && !value.medium && !value.campaign))
    return path;
  const url = new URL(path, location.origin);
  for (const [key, field] of Object.entries(value))
    if (field) url.searchParams.set(`acq_${key}`, field);
  return `${url.pathname}${url.search}`;
}
