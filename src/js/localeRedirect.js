(function () {
  const PREF_KEY = 'mySpellingGamePreferredLocale';

  function normalizeLocale(locale) {
    const value = String(locale || '').toLowerCase();
    if (value.startsWith('zh')) return 'zh';
    if (value.startsWith('pt')) return 'pt-BR';
    if (value.startsWith('es')) return 'es';
    if (value.startsWith('fr')) return 'fr';
    if (value.startsWith('id') || value.startsWith('in')) return 'id';
    return 'en';
  }

  function writeStoredLocale(locale) {
    try {
      localStorage.setItem(PREF_KEY, normalizeLocale(locale));
    } catch (_) {
      // Storage can be blocked in private or hardened browsers.
    }
  }

  document.addEventListener('click', function (event) {
    const link = event.target.closest && event.target.closest('a.lang-option[hreflang]');
    if (!link) return;
    writeStoredLocale(link.getAttribute('hreflang'));
    const query = new URLSearchParams(window.location.search);
    query.delete('lang');
    if (query.size || window.location.hash) {
      const target = new URL(link.getAttribute('href'), window.location.origin);
      target.search = query.toString();
      target.hash = window.location.hash;
      link.setAttribute('href', target.pathname + target.search + target.hash);
    }
  });

  const params = new URLSearchParams(window.location.search);
  const queryLocale = params.get('lang');
  if (queryLocale) {
    writeStoredLocale(queryLocale);
    params.delete('lang');
    if (window.history && window.history.replaceState) {
      const query = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (query ? `?${query}` : '') + window.location.hash);
    }
  }
})();
