export function featureTrialActive(trial) {
  if (!trial?.active || !trial.endsAt) return false;
  const ends = Date.parse(trial.endsAt);
  return Number.isFinite(ends) && ends > Date.now();
}

export function featureTrialLabel(trial, message, locale = "en") {
  if (!featureTrialActive(trial)) return "";
  const ends = new Date(trial.endsAt);
  const remainingMs = ends.getTime() - Date.now();
  const date = new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
  }).format(ends);
  const days = Math.ceil(remainingMs / 86_400_000);
  const hours = Math.max(1, Math.ceil(remainingMs / 3_600_000));
  const time =
    remainingMs >= 86_400_000
      ? days === 1
        ? message("featureTrialDay")
        : message("featureTrialDays", { count: days })
      : hours === 1
        ? message("featureTrialHour")
        : message("featureTrialHours", { count: hours });
  return message("featureTrialStatus", { time, date });
}
