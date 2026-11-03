import { exampleSentenceParts, isLowQualitySentenceTemplate } from "./spellingCore.mjs";

export function renderExampleHint(
  word,
  sentence,
  className = "assignment-example",
) {
  if (!String(sentence || "").trim()) return null;
  if (isLowQualitySentenceTemplate(sentence)) return null;
  const parts = exampleSentenceParts(sentence, word);
  if (!parts.some((part) => part.blank)) return null;
  const hint = document.createElement("p");
  hint.className = className;
  for (const part of parts) {
    if (part.blank) {
      const blank = document.createElement("span");
      blank.className = "assignment-example-blank";
      blank.setAttribute("aria-hidden", "true");
      blank.textContent = "\u00a0";
      hint.append(blank);
    } else {
      hint.append(document.createTextNode(part.text));
    }
  }
  return hint;
}
