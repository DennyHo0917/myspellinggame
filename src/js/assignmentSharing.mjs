export const SHARE_CHANNELS = ["direct", "copy_link", "google_classroom"];
export function distributionChannel(value) {
  return SHARE_CHANNELS.includes(value) ? value : "direct";
}
export function assignmentShareURL(path, origin, locale, channel) {
  if (!path) return null;
  const url = new URL(path, origin);
  if (
    url.origin !== origin ||
    !/^\/(?:a\/[A-Za-z0-9_-]{24}|join\/[A-Za-z0-9_-]{8,24})$/.test(
      url.pathname,
    ) ||
    url.searchParams.has("learner")
  )
    return null;
  const assignment = url.searchParams.get("assignment");
  if (
    url.pathname.startsWith("/join/") &&
    !/^[A-Za-z0-9_-]{24}$/.test(assignment || "")
  )
    return null;
  url.search = "";
  if (url.pathname.startsWith("/join/"))
    url.searchParams.set("assignment", assignment);
  url.searchParams.set("lang", locale);
  url.searchParams.set("channel", distributionChannel(channel));
  return url.toString();
}
export function classroomShareURL(url, title, body) {
  const share = new URL("https://classroom.google.com/share");
  share.searchParams.set("url", url);
  share.searchParams.set("title", title);
  share.searchParams.set("body", body);
  share.searchParams.set("itemtype", "assignment");
  return share.toString();
}
