import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../src/js/localeRedirect.js', import.meta.url), 'utf8');

function run(search = '') {
  const listeners = {};
  const stored = new Map();
  const calls = { replace: [], history: [] };
  const context = {
    URL,
    URLSearchParams,
    localStorage: {
      getItem: (key) => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value),
    },
    document: { addEventListener: (name, listener) => { listeners[name] = listener; } },
    window: {
      location: { origin: 'https://myspellinggame.com', pathname: '/', search, hash: '#words=red%2Cblue' },
      history: { replaceState: (...args) => calls.history.push(args) },
    },
  };
  context.window.location.replace = (url) => calls.replace.push(url);
  vm.runInNewContext(source, context);
  return { listeners, stored, calls };
}

test('language detection never redirects visitors automatically', () => {
  const { calls } = run('');
  assert.deepEqual(calls.replace, []);
  assert.equal(source.includes('window.location.replace'), false);
});

test('active language choices are still remembered', () => {
  const { listeners, stored } = run('');
  const attributes = new Map([['hreflang', 'pt-BR'], ['href', '/pt-br/']]);
  listeners.click({ target: { closest: () => ({
    getAttribute: (name) => attributes.get(name),
    setAttribute: (name, value) => attributes.set(name, value),
  }) } });
  assert.equal(stored.get('mySpellingGamePreferredLocale'), 'pt-BR');
  assert.equal(attributes.get('href'), '/pt-br/#words=red%2Cblue');
});

test('lang query preference is consumed without dropping other share state', () => {
  const { stored, calls } = run('?lang=fr&words=legacy');
  assert.equal(stored.get('mySpellingGamePreferredLocale'), 'fr');
  assert.equal(calls.history[0][2], '/?words=legacy#words=red%2Cblue');
});
