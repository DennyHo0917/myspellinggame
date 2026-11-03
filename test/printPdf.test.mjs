import { test } from "node:test";
import assert from "node:assert/strict";
import { generateQRCodeMatrix, qrCodeToSvg } from "../src/js/qrcode.mjs";
import {
  buildTakeHomePdf,
  buildParentReportPdf,
  buildMissedWordsPdf,
  buildClassroomGuidePdf,
} from "../src/js/pdfWriter.mjs";
import {
  renderTakeHomeSheetHtml,
  renderParentReportSheetHtml,
  renderMissedWordsSheetHtml,
  renderClassroomGuideSheetHtml,
} from "../src/js/sheetRenderer.mjs";
import { sanitizeEventParams } from "../src/js/analytics.mjs";
import { PRODUCT_LOCALES, productMessages } from "../src/js/productLocale.mjs";

test("P0-1: QR code generator creates valid 2D matrix and SVG for assignment URLs", () => {
  const shortUrl = "https://myspellinggame.com/a/abc";
  const m1 = generateQRCodeMatrix(shortUrl);
  assert.ok(m1.length >= 21, "V1 or higher size");
  assert.equal(m1.length, m1[0].length, "Square matrix");

  const longUrl = "https://myspellinggame.com/a/39414bf8-1234-5678-90ab?learner=cde5678&lang=en&channel=copy_link";
  const m2 = generateQRCodeMatrix(longUrl);
  assert.ok(m2.length >= 33, "Matrix expands for longer URL");

  const svg = qrCodeToSvg(m1, 100);
  assert.ok(svg.startsWith("<svg"), "Produces valid SVG");
  assert.ok(svg.includes("viewBox="), "Contains viewBox");
  assert.ok(svg.includes("<path"), "Contains path elements");
  assert.ok(svg.endsWith("</svg>"), "Closes SVG tag");
});

test("P0-1: Take-home PDF generates valid Letter document with dictation lines and QR code", () => {
  const copy = productMessages("en");
  const words = [
    { word: "because", example_sentence: "We went inside because it started to rain." },
    { word: "friend", example_sentence: "My friend helped me with my homework." },
    { word: "important", example_sentence: "The teacher wrote the adverb not on the board." }, // bad template should be sanitized
  ];

  const result = buildTakeHomePdf({
    title: "Unit 3 Spelling List",
    due: "Friday, Nov 7",
    mode: "Dictation",
    words,
    studentUrl: "https://myspellinggame.com/a/unit3?lang=en",
    copy,
  });

  assert.equal(result.filename, "myspellinggame-unit-3-spelling-list-takehome.pdf");
  assert.ok(result.bytes instanceof Uint8Array, "Returns byte buffer");

  const pdfStr = Buffer.from(result.bytes).toString("latin1");
  assert.ok(pdfStr.startsWith("%PDF-1.4"), "Valid PDF 1.4 header");
  assert.ok(pdfStr.includes("/MediaBox [0 0 612 792]"), "Letter paper dimensions (612 x 792 pt)");
  assert.ok(pdfStr.includes("Unit 3 Spelling List"), "Contains assignment title");
  assert.ok(pdfStr.includes("because"), "Contains spelling words");
  assert.ok(!pdfStr.includes("The teacher wrote the adverb"), "Sanitizes bad adverb sentence template");
  assert.ok(pdfStr.includes("Due: Friday, Nov 7"), "Due date formatted without {date}");
  assert.ok(!pdfStr.includes("{date}"), "No unrendered {date} in PDF");
  assert.ok(pdfStr.includes("Students practice free online"), "Contains footer note");
  assert.ok(pdfStr.includes("$14.99/mo"), "Includes Teacher $14.99/mo CTA");
  assert.ok(pdfStr.includes("%%EOF"), "Valid PDF EOF trailer");

  const html = renderTakeHomeSheetHtml({
    title: "Unit 3 Spelling List",
    due: "Friday, Nov 7",
    mode: "Dictation",
    words,
    studentUrl: "https://myspellinggame.com/a/unit3?lang=en",
    copy,
  });
  assert.ok(html.includes("sheet-dictation-line"), "HTML preview includes dictation lines");
  assert.ok(html.includes("<svg"), "HTML preview includes QR code SVG");
  assert.ok(html.includes("<strong>Due:</strong> Friday, Nov 7"), "HTML due date has clean label without {date}");
  assert.ok(!html.includes("{count}"), "Contains no raw {count} template variable");
  assert.ok(!html.includes("{date}"), "Contains no raw {date} template variable");
});

test("P0-2: Parent report PDF distinguishes Free sample watermark vs Paid unwatermarked", () => {
  const copy = productMessages("en");

  // Free sample report
  const freeSample = buildParentReportPdf({
    nickname: "Leo",
    assignmentTitle: "Weekly Quiz",
    dateStr: "Nov 3, 2026",
    accuracy: 85,
    correctCount: 17,
    totalCount: 20,
    missedWords: ["beautiful", "enough"],
    studentUrl: "https://myspellinggame.com/a/quiz?lang=en",
    isFreeSample: true,
    copy,
  });

  assert.equal(freeSample.filename, "myspellinggame-leo-parent-report.pdf");
  const freePdfStr = Buffer.from(freeSample.bytes).toString("latin1");
  assert.ok(freePdfStr.includes("SAMPLE"), "Free report contains SAMPLE watermark");
  assert.ok(freePdfStr.includes("$14.99/mo"), "Free report mentions $14.99/mo upgrade");

  // Paid report
  const paidReport = buildParentReportPdf({
    nickname: "Leo",
    assignmentTitle: "Weekly Quiz",
    dateStr: "Nov 3, 2026",
    accuracy: 85,
    correctCount: 17,
    totalCount: 20,
    missedWords: ["beautiful", "enough"],
    studentUrl: "https://myspellinggame.com/a/quiz?lang=en",
    isFreeSample: false,
    copy,
  });

  const paidPdfStr = Buffer.from(paidReport.bytes).toString("latin1");
  assert.ok(!paidPdfStr.includes("SAMPLE"), "Paid report omits SAMPLE watermark");

  // Free preview HTML
  const freeHtml = renderParentReportSheetHtml({
    nickname: "Sample Learner",
    assignmentTitle: "Weekly Quiz",
    dateStr: "Nov 3, 2026",
    accuracy: 80,
    correctCount: 8,
    totalCount: 10,
    missedWords: ["beautiful"],
    studentUrl: "https://myspellinggame.com/a/quiz?lang=en",
    isFreeSample: true,
    copy,
  });
  assert.ok(freeHtml.includes("sheet-watermark"), "HTML preview renders watermark div in sample mode");
  assert.ok(!freeHtml.includes("{count}"), "Contains no raw {count} template variable");
});

test("P1-3: Classroom 1-Page Guide PDF generates 3-step cheat sheet", () => {
  const copy = productMessages("en");
  const guide = buildClassroomGuidePdf({ copy });
  assert.equal(guide.filename, "myspellinggame-classroom-guide.pdf");

  const pdfStr = Buffer.from(guide.bytes).toString("latin1");
  assert.ok(pdfStr.startsWith("%PDF-1.4"));
  assert.ok(pdfStr.includes("STEP 1: Create Your Assignment"));
  assert.ok(pdfStr.includes("STEP 2: Share to Google Classroom"));
  assert.ok(pdfStr.includes("STEP 3: Friday Results"));
  assert.ok(pdfStr.includes("Teacher Plan - $14.99/mo"));
  assert.ok(pdfStr.includes("from=print_classroom"));

  const html = renderClassroomGuideSheetHtml({ copy });
  assert.ok(html.includes("sheet-step-box"));
  assert.ok(html.includes("<svg"));
});

test("P1-4: Missed Words Sheet PDF generates Look-Cover-Write-Check practice lines", () => {
  const copy = productMessages("en");
  const paidResult = buildMissedWordsPdf({
    assignmentTitle: "Review List",
    words: ["beautiful", "suddenly", "through"],
    studentUrl: "https://myspellinggame.com/a/review?lang=en",
    isFreeSample: false,
    copy,
  });
  assert.equal(paidResult.filename, "myspellinggame-review-list-missed-words.pdf");

  const paidPdfStr = Buffer.from(paidResult.bytes).toString("latin1");
  assert.ok(paidPdfStr.includes("Look - Say - Cover - Write - Check"));
  assert.ok(paidPdfStr.includes("Practice 1"));
  assert.ok(paidPdfStr.includes("Practice 2"));
  assert.ok(paidPdfStr.includes("Practice 3"));
  assert.ok(paidPdfStr.includes("beautiful"));
  assert.ok(!paidPdfStr.includes("SAMPLE"), "Paid missed words has no watermark");

  const freeResult = buildMissedWordsPdf({
    assignmentTitle: "Review List",
    words: ["beautiful", "suddenly"],
    studentUrl: "https://myspellinggame.com/a/review?lang=en",
    isFreeSample: true,
    copy,
  });
  assert.equal(freeResult.filename, "myspellinggame-sample-missed-words.pdf");
  const freePdfStr = Buffer.from(freeResult.bytes).toString("latin1");
  assert.ok(freePdfStr.includes("SAMPLE"), "Free missed words has watermark");

  const html = renderMissedWordsSheetHtml({
    assignmentTitle: "Review List",
    words: ["beautiful", "suddenly"],
    studentUrl: "https://myspellinggame.com/a/review?lang=en",
    isFreeSample: true,
    copy,
  });
  assert.ok(html.includes("Look — Say — Cover — Write — Check"));
  assert.ok(html.includes("sheet-watermark"), "Free HTML preview has watermark");
  assert.ok(!html.includes("{count}"));
  assert.ok(!html.includes("{date}"));
});

test("Telemetry allowlist retains print parameters and strips sensitive fields", () => {
  const pii = { email: "teacher@example.com", name: "Teacher", password: "secret" };

  const takehomeEvent = sanitizeEventParams("print_takehome_click", {
    ...pii,
    plan: "free",
    mode: "dictation",
    word_count: 15,
  });
  assert.deepEqual(takehomeEvent, { plan: "free", mode: "dictation", word_count: 15 });

  const parentReportEvent = sanitizeEventParams("print_parent_report_click", {
    ...pii,
    plan: "free",
    is_sample: true,
  });
  assert.deepEqual(parentReportEvent, { plan: "free", is_sample: true });

  const missedWordsEvent = sanitizeEventParams("print_missed_words_click", {
    ...pii,
    plan: "teacher",
    count: 5,
    is_sample: false,
  });
  assert.deepEqual(missedWordsEvent, { plan: "teacher", count: 5, is_sample: false });
});

test("All print copy is complete in all 6 locales without placeholder leaks", () => {
  const requiredKeys = [
    "printTakeHome",
    "dueLabel",
    "takeHomeTitle",
    "wordListHeader",
    "practiceLinesHeader",
    "printFooterNote",
    "printFooterTeacherCta",
    "printParentReport",
    "previewPrint",
    "unlockFullReportsCta",
    "unlockMissedWordsCta",
    "downloadSamplePdf",
    "printSample",
    "sampleStudentNickname",
    "commonMissesFreeNotice",
    "parentReportTitle",
    "wordsToReview",
    "reviewAdvice",
    "sampleWatermark",
    "sampleFooterNotice",
    "printMissedWords",
    "missedWordsSheetTitle",
    "sampleMissedWordsWatermark",
    "sampleMissedWordsNotice",
    "lookCoverWriteCheck",
    "classroomGuideTitle",
    "classroomGuideBtn",
    "downloadPdf",
    "print",
    "practiceOnlineTitle",
    "scanOrVisit",
    "practiceAgainTitle",
    "scanToPracticeAgain",
  ];

  for (const [locale] of PRODUCT_LOCALES) {
    const copy = productMessages(locale);
    for (const key of requiredKeys) {
      assert.ok(copy[key]?.length > 0, `${locale}: missing ${key}`);
      assert.ok(!copy[key].includes("{count}"), `${locale}:${key} contains unrendered {count}`);
      assert.ok(!copy[key].includes("{date}"), `${locale}:${key} contains unrendered {date}`);
    }
  }
});
