import { normalizeAnswer } from "./spellingCore.mjs";

export function uniquePreviewWords(words, limit = 10) {
  const source = Array.isArray(words)
    ? words
    : String(words || "").split(/[\s,]+/);
  const seen = new Set();
  const result = [];
  const max = Number.isFinite(limit) ? limit : 10;
  for (const word of source) {
    const text = String(word || "").trim();
    const key = text.toLowerCase();
    if (!text || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= max) break;
  }
  return result;
}

export function learnerReviewPreviewWords(words, limit = 10) {
  return uniquePreviewWords(
    [...(words || [])]
      .filter(
        (word) =>
          Number(word?.incorrectCount) > 0 && word.status !== "mastered",
      )
      .sort(
        (a, b) =>
          String(b.lastIncorrectAt || "").localeCompare(
            String(a.lastIncorrectAt || ""),
          ) || Number(b.incorrectCount) - Number(a.incorrectCount),
      )
      .map((word) => word.word),
    limit,
  );
}

export function assignmentReviewPreviewWords(attempts, limit = 10) {
  const words = [];
  for (const attempt of attempts || [])
    words.push(...(attempt?.missed_words || []));
  return uniquePreviewWords(words, limit);
}

export function missedStatPreviewWords(items, limit = 10) {
  return uniquePreviewWords(
    [...(items || [])]
      .filter((item) => item?.word)
      .sort(
        (a, b) =>
          Number(b.misses || 0) - Number(a.misses || 0) ||
          String(a.word).localeCompare(String(b.word)),
      )
      .map((item) => item.word),
    limit,
  );
}

export function progressReviewPreviewWords(data, limit = 10) {
  const direct = Array.isArray(data?.missedWords) ? data.missedWords : [];
  if (direct.length) return missedStatPreviewWords(direct, limit);
  const nested = (data?.learners || []).flatMap(
    (learner) => learner.missed_words || [],
  );
  return missedStatPreviewWords(nested, limit);
}

export function renderSmartReviewPreview(
  host,
  { words, copy, onHear = () => false, onClose, paywall, limit = 10 } = {},
) {
  if (!host) return null;
  host.querySelector(".smart-review-preview")?.remove();
  const list = uniquePreviewWords(words, limit);
  if (!list.length) return null;
  const panel = document.createElement("section");
  panel.className = "smart-review-preview";
  panel.setAttribute("aria-label", copy.title || "Smart Review");
  if (copy.title) {
    const title = document.createElement("h3");
    title.className = "smart-review-preview-title";
    title.textContent = copy.title;
    panel.append(title);
  }
  if (copy.help) {
    const help = document.createElement("p");
    help.className = "smart-review-preview-help";
    help.textContent = copy.help;
    panel.append(help);
  }
  const progress = document.createElement("p");
  progress.className = "smart-review-progress";
  progress.textContent = copy.progress?.(1, list.length) || "";
  const card = document.createElement("div");
  card.className = "smart-review-card";
  const prompt = document.createElement("p");
  prompt.className = "smart-review-prompt";
  prompt.textContent = copy.prompt || "";
  const hear = document.createElement("button");
  hear.type = "button";
  hear.className = "smart-review-hear";
  hear.textContent = copy.hear || "";
  const speech = document.createElement("p");
  speech.className = "smart-review-speech";
  speech.setAttribute("role", "status");
  hear.addEventListener("click", () => {
    const spoken = onHear?.(list[0]) !== false;
    speech.textContent = spoken ? "" : copy.speechUnsupported || "";
  });
  const form = document.createElement("form");
  form.className = "smart-review-form";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "smart-review-answer";
  input.autocomplete = "off";
  input.autocapitalize = "none";
  input.spellcheck = false;
  input.setAttribute("aria-label", copy.prompt || copy.title || "");
  const check = document.createElement("button");
  check.type = "submit";
  check.className = "smart-review-check";
  check.textContent = copy.check || "";
  const feedback = document.createElement("p");
  feedback.className = "smart-review-feedback";
  feedback.setAttribute("role", "status");
  const reveal = document.createElement("p");
  reveal.className = "smart-review-reveal";
  reveal.hidden = true;
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!String(input.value || "").trim()) {
      feedback.textContent = copy.required || "";
      return;
    }
    const correct = normalizeAnswer(input.value) === normalizeAnswer(list[0]);
    feedback.textContent = correct
      ? copy.correct || ""
      : copy.incorrect?.(list[0]) || "";
    reveal.textContent = list[0];
    reveal.hidden = false;
  });
  form.append(input, check);
  card.append(prompt, hear, speech, form, feedback, reveal);
  panel.append(progress, card);
  if (list.length > 1) {
    const upNext = document.createElement("div");
    upNext.className = "smart-review-up-next";
    const label = document.createElement("p");
    label.textContent = copy.upNext || "";
    const chips = document.createElement("div");
    chips.className = "word-list";
    for (const word of list.slice(1)) {
      const chip = document.createElement("span");
      chip.className = "word-chip";
      chip.textContent = word;
      chips.append(chip);
    }
    upNext.append(label, chips);
    panel.append(upNext);
  }
  if (paywall) panel.append(paywall);
  if (copy.close) {
    const close = document.createElement("button");
    close.type = "button";
    close.className = "smart-review-close";
    close.textContent = copy.close;
    close.addEventListener("click", () => {
      panel.remove();
      onClose?.();
    });
    panel.append(close);
  }
  host.append(panel);
  return panel;
}
