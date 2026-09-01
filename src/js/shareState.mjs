const VALID_MODES = new Set(['dictation', 'typing']);
const MAX_SHARE_BYTES = 100000;

function base64UrlFromBytes(bytes) {
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function bytesFromBase64Url(value) {
  const base64 = String(value || '').replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - base64.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

// ponytail: bounded synchronous LZ keeps existing link generation synchronous; native streams are async.
function compressBytes(bytes) {
  const output = [];
  const positions = new Map();
  const addPosition = (position) => {
    if (position + 2 >= bytes.length) return;
    const key = bytes[position] * 65536 + bytes[position + 1] * 256 + bytes[position + 2];
    const matches = positions.get(key);
    if (matches) {
      matches.push(position);
      if (matches.length > 64) matches.shift();
    } else {
      positions.set(key, [position]);
    }
  };
  let inputIndex = 0;
  let blockStart = 0;
  let flags = 0;
  let flagBit = 0;
  while (inputIndex < bytes.length) {
    if (flagBit === 0) blockStart = output.push(0) - 1;
    let bestOffset = 0;
    let bestLength = 0;
    if (inputIndex + 2 < bytes.length) {
      const key = bytes[inputIndex] * 65536 + bytes[inputIndex + 1] * 256 + bytes[inputIndex + 2];
      const matches = positions.get(key) || [];
      const oldest = Math.max(0, inputIndex - 4095);
      for (let index = matches.length - 1; index >= 0 && matches[index] >= oldest; index -= 1) {
        const candidate = matches[index];
        let length = 0;
        while (
          length < 18
          && inputIndex + length < bytes.length
          && bytes[candidate + length] === bytes[inputIndex + length]
        ) length += 1;
        if (length > bestLength) {
          bestLength = length;
          bestOffset = inputIndex - candidate;
          if (length === 18) break;
        }
      }
    }
    if (bestLength >= 3) {
      flags |= 1 << flagBit;
      output.push(bestOffset >> 4, ((bestOffset & 15) << 4) | (bestLength - 3));
      for (let position = inputIndex; position < inputIndex + bestLength; position += 1) addPosition(position);
      inputIndex += bestLength;
    } else {
      output.push(bytes[inputIndex]);
      addPosition(inputIndex);
      inputIndex += 1;
    }
    flagBit += 1;
    if (flagBit === 8) {
      output[blockStart] = flags;
      flags = 0;
      flagBit = 0;
    }
  }
  if (flagBit) output[blockStart] = flags;
  return Uint8Array.from(output);
}

function decompressBytes(bytes) {
  const output = [];
  let inputIndex = 0;
  while (inputIndex < bytes.length) {
    const flags = bytes[inputIndex++];
    for (let flagBit = 0; flagBit < 8 && inputIndex < bytes.length; flagBit += 1) {
      if (!(flags & (1 << flagBit))) {
        output.push(bytes[inputIndex++]);
        continue;
      }
      if (inputIndex + 1 >= bytes.length) throw new Error('Invalid share data');
      const first = bytes[inputIndex++];
      const second = bytes[inputIndex++];
      const offset = (first << 4) | (second >> 4);
      const length = (second & 15) + 3;
      if (!offset || offset > output.length || output.length + length > MAX_SHARE_BYTES) {
        throw new Error('Invalid share data');
      }
      for (let count = 0; count < length; count += 1) {
        output.push(output[output.length - offset]);
      }
    }
  }
  return Uint8Array.from(output);
}

function encodeShareData(value) {
  const bytes = new TextEncoder().encode(value);
  const compressed = compressBytes(bytes);
  return `${compressed.length < bytes.length ? 'z.' : 'b.'}${base64UrlFromBytes(
    compressed.length < bytes.length ? compressed : bytes,
  )}`;
}

function decodeShareData(value) {
  const encoded = String(value || '');
  const compressed = encoded.startsWith('z.');
  const bytes = compressed
    ? decompressBytes(bytesFromBase64Url(encoded.slice(2)))
    : bytesFromBase64Url(encoded.startsWith('b.') ? encoded.slice(2) : encoded);
  return new TextDecoder().decode(bytes);
}

function paramsFrom(value) {
  return new URLSearchParams(String(value || '').replace(/^[?#]/, ''));
}

export function readShareState(locationLike = {}) {
  const hash = paramsFrom(locationLike.hash);
  const query = paramsFrom(locationLike.search);
  const hashHasShare = hash.has('data') || hash.has('words') || hash.has('mode');
  const params = hashHasShare ? hash : query;
  let sharedData;
  if (params.has('data')) {
    try {
      sharedData = JSON.parse(decodeShareData(params.get('data')));
    } catch (_) {
      sharedData = null;
    }
  }
  const words = typeof sharedData?.words === 'string' ? sharedData.words : params.get('words') || '';
  const requestedMode = sharedData?.mode || params.get('mode');
  const mode = VALID_MODES.has(requestedMode)
    ? requestedMode
    : (!hashHasShare && query.has('words') ? 'typing' : 'dictation');

  return {
    words,
    mode,
    exampleSentences: typeof sharedData?.exampleSentences === 'string'
      ? sharedData.exampleSentences
      : params.get('sentences') || '',
    autoStart: sharedData ? sharedData.autoStart === true : params.get('autostart') === '1',
    entryPage: (sharedData?.entryPage || params.get('entry'))?.startsWith('/')
      ? sharedData?.entryPage || params.get('entry')
      : '',
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
  const sentences = Array.isArray(exampleSentences)
    ? exampleSentences.join('\n')
    : String(exampleSentences || '');
  params.set('data', encodeShareData(JSON.stringify({
    words: words.join(','),
    mode: VALID_MODES.has(mode) ? mode : 'dictation',
    exampleSentences: sentences,
    autoStart: Boolean(autoStart),
    entryPage: entryPage.startsWith('/') ? entryPage : '',
  })));
  return `#${params.toString()}`;
}
