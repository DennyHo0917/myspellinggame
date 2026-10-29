// Controlled dimensions only. Never persist URLs, referrers, PINs or tokens.
export const DISTRIBUTION_CHANNELS = [
  "direct",
  "copy_link",
  "google_classroom",
] as const;
export function distributionChannel(value: unknown) {
  return DISTRIBUTION_CHANNELS.find((channel) => channel === value) ?? "direct";
}
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
export function adultAcquisition(body: Record<string, unknown>) {
  const source = ["chatgpt.com", "chat.openai.com"].includes(
    String(body.source),
  )
    ? "chatgpt"
    : String(body.source);
  const medium =
    body.medium === "ai-assistant" ? "ai_assistant" : String(body.medium);
  return {
    source: SOURCES.includes(source) ? source : "direct",
    medium: MEDIUMS.includes(medium) ? medium : null,
    campaign: CAMPAIGNS.includes(String(body.campaign))
      ? String(body.campaign)
      : null,
  };
}
