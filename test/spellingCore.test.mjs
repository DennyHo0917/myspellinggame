import test from "node:test";
import assert from "node:assert/strict";

import {
  advanceDictationSession,
  analyzeWords,
  configuredWords,
  createDictationSession,
  customTypingRoundComplete,
  currentDictationWord,
  dictationSpeechText,
  dictationSummary,
  exampleSentenceParts,
  normalizeAnswer,
  parseWords,
  SAMPLE_EXAMPLE_SENTENCES,
  SAMPLE_WORDS,
  retryMissedDictation,
  shouldEndTypingOnMiss,
  submitDictationAnswer,
  takeCustomWord,
  typingCompletionStats,
} from "../src/js/spellingCore.mjs";
import {
  chaseSentenceRanges,
  chaseSnapshot,
  chaseWordCount,
  compareChaseInput,
  createChaseSession,
  registerChaseInput,
} from "../src/js/chaseCore.mjs";

test("Typing Chase advances only through the correct passage prefix", () => {
  const session = createChaseSession("Run to the old bridge.", {
    now: 0,
    thiefWpm: 12,
    headStartChars: 5,
  });
  assert.deepEqual(compareChaseInput(session.passage, "Run to"), {
    prefixLength: 6,
    valid: true,
    complete: false,
  });
  registerChaseInput(session, "Run x", 1_000);
  assert.equal(session.correctChars, 4);
  assert.equal(session.mistakes, 5);
  registerChaseInput(session, "Run ", 1_200);
  registerChaseInput(session, "Run to the old bridge.", 2_000);
  const snapshot = chaseSnapshot(session, 2_000);
  assert.equal(snapshot.caught, true);
  assert.equal(snapshot.escaped, false);
  assert.ok(snapshot.accuracy < 100);
});

test("Typing Chase rewards speed before the passage is finished", () => {
  const passage = Array.from({ length: 200 }, () => "word").join(" ");
  const session = createChaseSession(passage, {
    now: 0,
    thiefWpm: 20,
    headStartChars: 10,
  });
  const before = chaseSnapshot(session, 1_000);
  const later = chaseSnapshot(session, 6_000);
  assert.ok(later.thiefDistance > before.thiefDistance);
  assert.equal(later.thiefDistance - before.thiefDistance, 25 / 3);
  registerChaseInput(session, passage.slice(0, 60), 10_000);
  const caught = chaseSnapshot(session, 10_000);
  assert.equal(chaseWordCount(passage), 200);
  assert.equal(caught.caught, true);
  assert.ok(session.correctChars < session.passage.length);
});

test("Typing Chase thief runs at 40 WPM without a time limit", () => {
  const session = createChaseSession("A long chase through the city.", {
    now: 0,
  });
  const snapshot = chaseSnapshot(session, 60_000);
  assert.equal(session.thiefWpm, 40);
  assert.equal(snapshot.thiefDistance, 230);
  assert.equal(snapshot.escaped, false);
});

test("Typing Chase ends after the player trails by more than 30 WPM", () => {
  const session = createChaseSession("Keep running through the city.", {
    now: 0,
  });
  assert.equal(chaseSnapshot(session, 4_999).outpaced, false);
  assert.equal(chaseSnapshot(session, 5_000).outpaced, true);
  registerChaseInput(session, "Keep ", 6_000);
  assert.equal(chaseSnapshot(session, 6_000).outpaced, false);
});

test("Typing Chase hard mode accelerates the thief up to 55 WPM", () => {
  const session = createChaseSession("A long chase through the city.", {
    now: 0,
    thiefWpm: 45,
    thiefMaxWpm: 55,
    dynamicThief: true,
  });
  registerChaseInput(session, "A long chase through", 1_000);
  const snapshot = chaseSnapshot(session, 1_000);
  assert.equal(snapshot.thiefWpm, 55);
  assert.equal(session.thiefWpm, 45);
});

test("Typing Chase shows one complete sentence at a time", () => {
  assert.deepEqual(chaseSentenceRanges("Mr. Chen ran home. He felt safe."), [
    { start: 0, end: 18, text: "Mr. Chen ran home." },
    { start: 19, end: 32, text: "He felt safe." },
  ]);
});

test("sample words ship with one example sentence per word", () => {
  assert.equal(SAMPLE_EXAMPLE_SENTENCES.length, SAMPLE_WORDS.length);
  assert.ok(SAMPLE_EXAMPLE_SENTENCES.every((sentence) => sentence.trim()));
  assert.ok(
    SAMPLE_WORDS.every((word, index) =>
      SAMPLE_EXAMPLE_SENTENCES[index].toLowerCase().includes(word),
    ),
  );
});

test("example sentences hide every standalone occurrence of the target word", () => {
  const parts = exampleSentenceParts(
    "I went to the library yesterday. The library was quiet.",
    "library",
  );
  assert.equal(parts.filter((part) => part.blank).length, 2);
  assert.equal(
    parts
      .filter((part) => !part.blank)
      .map((part) => part.text)
      .join(""),
    "I went to the  yesterday. The  was quiet.",
  );
});

test("dictation speech includes the word and sentence once, or just the word", () => {
  assert.equal(
    dictationSpeechText("library", "I went to the library yesterday."),
    "library. I went to the library yesterday.",
  );
  assert.equal(dictationSpeechText("library", ""), "library");
});

test("dictation uses each word once and completes after the last answer", () => {
  const session = createDictationSession(["one", "two", "three"]);
  const seen = [];

  while (currentDictationWord(session)) {
    seen.push(currentDictationWord(session));
    submitDictationAnswer(session, currentDictationWord(session));
    advanceDictationSession(session);
  }

  assert.deepEqual(seen, ["one", "two", "three"]);
  assert.deepEqual(dictationSummary(session), {
    total: 3,
    correct: 3,
    incorrect: 0,
    accuracy: 100,
    missedWords: [],
  });
});

test("missed words can be retried on their own", () => {
  const session = createDictationSession(["alpha", "beta", "gamma"]);
  submitDictationAnswer(session, "alpha");
  advanceDictationSession(session);
  submitDictationAnswer(session, "wrong");
  advanceDictationSession(session);
  submitDictationAnswer(session, "gamma");

  const retry = retryMissedDictation(session);
  assert.deepEqual(retry.words, ["beta"]);
  assert.equal(currentDictationWord(retry), "beta");
});

test("custom typing words stop at exhaustion without a fallback word", () => {
  let cursor = 0;
  const words = ["red", "blue"];
  const first = takeCustomWord(words, cursor);
  cursor = first.cursor;
  const second = takeCustomWord(words, cursor);
  cursor = second.cursor;
  const exhausted = takeCustomWord(words, cursor);

  assert.equal(first.word, "red");
  assert.equal(second.word, "blue");
  assert.equal(exhausted.word, null);
  assert.equal(exhausted.cursor, 2);
});

test("empty input falls back and duplicate words are removed", () => {
  assert.deepEqual(parseWords(" Apple\nAPPLE, banana  banana "), [
    "apple",
    "banana",
  ]);
  assert.deepEqual(configuredWords("", ["sample"]), ["sample"]);
});

test("word parsing keeps values above the plan limit for explicit validation", () => {
  const words = Array.from(
    { length: 81 },
    (_, index) =>
      `word${index.toString(2).padStart(7, "a").replaceAll("0", "a").replaceAll("1", "b")}`,
  );
  assert.equal(parseWords(words.join("\n")).length, 81);
});

test("word analysis counts unique valid words and reports ignored entries", () => {
  const result = analyzeWords("Apple\napple\na\n" + "x".repeat(25));
  assert.deepEqual(result.words, ["apple"]);
  assert.deepEqual(result.duplicates, ["apple"]);
  assert.deepEqual(result.tooShort, ["a"]);
  assert.deepEqual(result.tooLong, ["x".repeat(25)]);
});

test("answer comparison ignores surrounding whitespace and case", () => {
  assert.equal(normalizeAnswer("  BeAuTiFuL  "), "beautiful");
  const session = createDictationSession(["beautiful"]);
  assert.equal(submitDictationAnswer(session, "  BEAUTIFUL ").correct, true);
});

test("custom Typing Rain processes all 20 words before ending", () => {
  const words = Array.from({ length: 20 }, (_, index) => `word${index}`);
  for (let processed = 1; processed <= 5; processed++) {
    assert.equal(shouldEndTypingOnMiss(true, processed, 5), false);
    assert.equal(customTypingRoundComplete(words.length, processed, 0), false);
  }
  assert.equal(customTypingRoundComplete(words.length, 19, 0), false);
  assert.equal(customTypingRoundComplete(words.length, 20, 1), false);
  assert.equal(customTypingRoundComplete(words.length, 20, 0), true);
  assert.equal(shouldEndTypingOnMiss(false, 5, 5), true);
});

test("Typing Rain completion and GA4 stats only count processed words", () => {
  const firstFiveMissed = ["one", "two", "three", "four", "five"];
  assert.deepEqual(typingCompletionStats(5, firstFiveMissed), {
    word_count: 5,
    correct_count: 0,
    missed_count: 5,
    accuracy: 0,
  });
  assert.deepEqual(typingCompletionStats(20, firstFiveMissed), {
    word_count: 20,
    correct_count: 15,
    missed_count: 5,
    accuracy: 75,
  });
});
