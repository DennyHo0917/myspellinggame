const TARGETS = 'textarea[name="words"], #custom-word-list, #custom-example-sentences, #saved-list-words, #saved-list-sentences, #assignment-words, #assignment-sentences';

function renderMarkers(textarea, layer) {
  if (!textarea.value) {
    layer.innerHTML = '';
    return;
  }
  const lines = textarea.value.split(/\r?\n/);
  layer.innerHTML = lines.map((_, index) => `<div>${index + 1}.</div>`).join('');
  layer.scrollTop = textarea.scrollTop;
}

function enhance(textarea) {
  if (textarea.dataset.inlineNumbers === 'true') return;
  textarea.dataset.inlineNumbers = 'true';
  const wrapper = document.createElement('div');
  wrapper.className = 'inline-numbered-input';
  const layer = document.createElement('div');
  layer.className = 'list-marker-layer';
  layer.setAttribute('aria-hidden', 'true');
  textarea.parentNode.insertBefore(wrapper, textarea);
  wrapper.append(layer, textarea);
  textarea.classList.add('inline-numbered-textarea');
  const styles = getComputedStyle(textarea);
  layer.style.fontFamily = styles.fontFamily;
  layer.style.fontSize = styles.fontSize;
  layer.style.fontStyle = styles.fontStyle;
  layer.style.fontWeight = styles.fontWeight;
  layer.style.letterSpacing = styles.letterSpacing;
  layer.style.lineHeight = styles.lineHeight;
  layer.style.paddingTop = styles.paddingTop;
  layer.style.paddingBottom = styles.paddingBottom;
  const update = () => renderMarkers(textarea, layer);
  textarea.addEventListener('input', update);
  textarea.addEventListener('scroll', () => { layer.scrollTop = textarea.scrollTop; });
  update();
}

export function initLineNumbers(root = document) {
  root.querySelectorAll(TARGETS).forEach(enhance);
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => initLineNumbers());
  new MutationObserver(() => initLineNumbers()).observe(document.documentElement, { childList: true, subtree: true });
}
