export function cleanChasePassage(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

export function chaseWordCount(value) {
  const passage = cleanChasePassage(value);
  return passage ? passage.split(" ").length : 0;
}

export function chaseSentenceRanges(value) {
  const passage = cleanChasePassage(value);
  if (!passage) return [];
  if (typeof Intl?.Segmenter === "function") {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: "sentence",
    });
    const ranges = Array.from(
      segmenter.segment(passage),
      ({ segment, index }) => {
        const text = segment.trim();
        const start = index + segment.indexOf(text);
        return { start, end: start + text.length, text };
      },
    );
    return ranges.reduce((sentences, range) => {
      const previous = sentences.at(-1);
      if (/^(?:Mr|Mrs|Ms|Dr|Prof|St|Jr|Sr)\.$/.test(previous?.text || "")) {
        previous.end = range.end;
        previous.text = passage.slice(previous.start, range.end);
      } else {
        sentences.push(range);
      }
      return sentences;
    }, []);
  }
  return Array.from(
    passage.matchAll(/[^.!?]+(?:[.!?]+["'”’]?|$)/g),
    (match) => {
      const text = match[0].trim();
      const start = match.index + match[0].indexOf(text);
      return { start, end: start + text.length, text };
    },
  );
}

export function createChaseSession(
  value,
  {
    now = 0,
    thiefWpm = 40,
    thiefMaxWpm = thiefWpm,
    dynamicThief = false,
    headStartChars = 30,
  } = {},
) {
  const passage = cleanChasePassage(value);
  if (!passage) throw new Error("A chase passage is required.");
  const thiefCharsPerMs = (thiefWpm * 5) / 60_000;
  return {
    passage,
    input: "",
    correctChars: 0,
    correctKeystrokes: 0,
    mistakes: 0,
    startedAt: now,
    lastFrameAt: now,
    thiefWpm,
    thiefMaxWpm,
    dynamicThief,
    thiefCharsPerMs,
    headStartChars,
    thiefDistance: headStartChars,
    lastDistanceAt: now,
    recentHits: [],
    roadOffset: 0,
    finished: false,
  };
}

export function compareChaseInput(passage, value) {
  const input = String(value || "");
  let prefixLength = 0;
  while (
    prefixLength < input.length &&
    prefixLength < passage.length &&
    input[prefixLength] === passage[prefixLength]
  ) {
    prefixLength += 1;
  }
  return {
    prefixLength,
    valid: prefixLength === input.length,
    complete:
      prefixLength === passage.length && input.length === passage.length,
  };
}

export function registerChaseInput(session, value, now) {
  const nextValue = String(value || "");
  const added = Math.max(0, nextValue.length - session.input.length);
  const comparison = compareChaseInput(session.passage, nextValue);
  if (added) {
    if (comparison.valid) {
      session.correctKeystrokes += added;
      for (let index = 0; index < added; index += 1)
        session.recentHits.push(now);
    } else {
      session.mistakes += added;
    }
  }
  session.input = nextValue;
  session.correctChars = comparison.prefixLength;
  return comparison;
}

export function chaseSnapshot(session, now) {
  const elapsedMs = Math.max(0, now - session.startedAt);
  const policeDistance = session.correctChars;
  const totalKeystrokes = session.correctKeystrokes + session.mistakes;
  const accuracy = totalKeystrokes
    ? Math.round((session.correctKeystrokes / totalKeystrokes) * 100)
    : 100;
  const wpm = elapsedMs
    ? Math.round(session.correctChars / 5 / (elapsedMs / 60_000))
    : 0;
  session.recentHits = session.recentHits.filter(
    (timestamp) => now - timestamp <= 5_000,
  );
  const rollingWindowMs = Math.max(1_000, Math.min(5_000, elapsedMs));
  const rollingWpm = Math.round(
    session.recentHits.length / 5 / (rollingWindowMs / 60_000),
  );
  const currentThiefWpm = session.dynamicThief
    ? Math.min(
        session.thiefMaxWpm,
        session.thiefWpm + Math.max(0, rollingWpm - session.thiefWpm),
      )
    : session.thiefWpm;
  let thiefDistance;
  if (session.dynamicThief) {
    const distanceDeltaMs = Math.max(0, now - session.lastDistanceAt);
    session.thiefDistance += distanceDeltaMs * ((currentThiefWpm * 5) / 60_000);
    session.lastDistanceAt = now;
    thiefDistance = session.thiefDistance;
  } else {
    thiefDistance =
      session.headStartChars + elapsedMs * session.thiefCharsPerMs;
  }
  const progress = Math.min(1, policeDistance / thiefDistance);
  return {
    elapsedMs,
    progress,
    gap: Math.max(
      0.055,
      Math.min(
        0.38,
        0.055 +
          ((thiefDistance - policeDistance) / session.headStartChars) * 0.23,
      ),
    ),
    policeDistance,
    thiefDistance,
    accuracy,
    wpm,
    rollingWpm,
    thiefWpm: currentThiefWpm,
    outpaced: elapsedMs >= 5_000 && currentThiefWpm - rollingWpm > 30,
    escaped: false,
    caught: policeDistance >= thiefDistance,
  };
}
