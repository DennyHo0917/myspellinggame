const VALID_MODES = new Set(['dictation', 'typing']);

function paramsFrom(value) {
  return new URLSearchParams(String(value || '').replace(/^[?#]/, ''));
}

export function readShareState(locationLike = {}) {
  const hash = paramsFrom(locationLike.hash);
  const query = paramsFrom(locationLike.search);
  const hashHasShare = hash.has('words') || hash.has('mode');
  const params = hashHasShare ? hash : query;
  const words = params.get('words') || '';
  const requestedMode = params.get('mode');
  const mode = VALID_MODES.has(requestedMode)
    ? requestedMode
    : (!hashHasShare && query.has('words') ? 'typing' : 'dictation');

  return {
    words,
    mode,
    exampleSentences: params.get('sentences') || '',
    autoStart: params.get('autostart') === '1',
    entryPage: params.get('entry')?.startsWith('/') ? params.get('entry') : '',
    sharedLink: Boolean(words),
    source: hashHasShare ? 'hash' : query.has('words') || query.has('mode') ? 'query' : 'none',
  };
}

export function buildShareHash(
  words,
  mode = 'dictation',
  { autoStart = false, entryPage = '', exampleSentences = '' } = {},
) {
  const params = new URLSearchParams();
  params.set('words', words.join(','));
  params.set('mode', VALID_MODES.has(mode) ? mode : 'dictation');
  const sentences = Array.isArray(exampleSentences)
    ? exampleSentences.join('\n')
    : String(exampleSentences || '');
  if (sentences) params.set('sentences', sentences);
  if (autoStart) params.set('autostart', '1');
  if (entryPage.startsWith('/')) params.set('entry', entryPage);
  return `#${params.toString()}`;
}
