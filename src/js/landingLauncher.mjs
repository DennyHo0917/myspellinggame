import './lineNumbers.mjs';
import { ANONYMOUS_WORD_LIMIT, parseWords } from './spellingCore.mjs';
import { buildShareHash } from './shareState.mjs';

export function launcherUrl(action, text, mode, entryPage = '') {
  const words = parseWords(text);
  if (!words.length || words.length > ANONYMOUS_WORD_LIMIT) return null;
  const url = new URL(action, typeof window === 'undefined' ? 'https://myspellinggame.com' : window.location.href);
  url.search = '';
  url.hash = buildShareHash(words, mode, { autoStart: true, entryPage }).slice(1);
  return url.toString();
}

if (typeof document !== 'undefined') {
  document.querySelectorAll('form.landing-launcher').forEach((form) => {
    const input = form.querySelector('textarea[name="words"]');
    input?.addEventListener('input', () => input.setCustomValidity(''));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const target = launcherUrl(form.action, input?.value || '', form.dataset.mode || 'dictation', window.location.pathname);
      if (!target) {
        input?.setCustomValidity(
          parseWords(input?.value || '').length > ANONYMOUS_WORD_LIMIT
            ? form.dataset.limit || 'No-login practice supports up to 20 words per list.'
            : form.dataset.invalid || 'Enter at least one word.',
        );
        input?.reportValidity();
        return;
      }
      input.setCustomValidity('');
      window.location.assign(target);
    });
  });
}
import './lineNumbers.mjs';
