const TARGETS =
  'textarea[name="words"], #custom-word-list, #custom-example-sentences, #saved-list-words, #saved-list-sentences, #assignment-words, #assignment-sentences';

function renderMarkers(textarea, layer, measure) {
  if (!textarea.value) {
    layer.replaceChildren();
    return;
  }

  const styles = getComputedStyle(textarea);
  const contentWidth =
    textarea.clientWidth -
    parseFloat(styles.paddingLeft) -
    parseFloat(styles.paddingRight);
  measure.style.width = `${Math.max(0, contentWidth)}px`;

  const lines = textarea.value.split(/\r?\n/);
  const markers = lines.map((line, index) => {
    measure.textContent = line || "\u00a0";
    const marker = document.createElement("div");
    marker.textContent = `${index + 1}.`;
    marker.style.height = `${measure.offsetHeight}px`;
    return marker;
  });
  layer.replaceChildren(...markers);
  layer.scrollTop = textarea.scrollTop;
}

function enhance(textarea) {
  if (textarea.dataset.inlineNumbers === "true") return;
  textarea.dataset.inlineNumbers = "true";
  const wrapper = document.createElement("div");
  wrapper.className = "inline-numbered-input";
  const layer = document.createElement("div");
  layer.className = "list-marker-layer";
  layer.setAttribute("aria-hidden", "true");
  const measure = document.createElement("div");
  measure.setAttribute("aria-hidden", "true");
  Object.assign(measure.style, {
    position: "absolute",
    visibility: "hidden",
    pointerEvents: "none",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
  });
  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.append(layer, measure, textarea);
  textarea.classList.add("inline-numbered-textarea");
  const styles = getComputedStyle(textarea);
  for (const property of [
    "fontFamily",
    "fontSize",
    "fontStyle",
    "fontWeight",
    "letterSpacing",
    "lineHeight",
  ]) {
    layer.style[property] = styles[property];
    measure.style[property] = styles[property];
  }
  layer.style.paddingTop = styles.paddingTop;
  layer.style.paddingBottom = styles.paddingBottom;
  const update = () => renderMarkers(textarea, layer, measure);
  textarea.addEventListener("input", update);
  textarea.addEventListener("scroll", () => {
    layer.scrollTop = textarea.scrollTop;
  });
  if (typeof ResizeObserver !== "undefined") {
    new ResizeObserver(update).observe(textarea);
  }
  update();
}

export function initLineNumbers(root = document) {
  root.querySelectorAll(TARGETS).forEach(enhance);
}

if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => initLineNumbers());
  new MutationObserver(() => initLineNumbers()).observe(
    document.documentElement,
    { childList: true, subtree: true },
  );
}
