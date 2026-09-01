import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const speechSource = await readFile(
  new URL("../src/js/speech.js", import.meta.url),
  "utf8",
);
const { speechSupported, speakWord } = await import(
  `data:text/javascript,${encodeURIComponent(speechSource)}`
);

test("speech playback reports unsupported browsers instead of failing silently", () => {
  const previousWindow = globalThis.window;
  try {
    globalThis.window = {};
    assert.equal(speechSupported(), false);
    assert.equal(speakWord("hello"), false);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("speech playback uses the browser synthesis API when supported", () => {
  const previousWindow = globalThis.window;
  const calls = [];
  class Utterance {
    constructor(text) {
      this.text = text;
    }
  }
  try {
    globalThis.window = {
      SpeechSynthesisUtterance: Utterance,
      speechSynthesis: {
        cancel() {
          calls.push("cancel");
        },
        speak(utterance) {
          calls.push(utterance);
        },
      },
    };
    assert.equal(speechSupported(), true);
    assert.equal(speakWord("hello. I went home."), true);
    assert.equal(calls[0], "cancel");
    assert.equal(calls[1].text, "hello. I went home.");
    assert.equal(calls[1].lang, "en-US");
    assert.equal(calls[1].rate, 0.85);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
