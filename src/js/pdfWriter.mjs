// Pure JavaScript PDF 1.4 Generator (Letter Size: 612 x 792 pt / 8.5" x 11")
// Dependency-free, compatible with Node.js and modern browsers

import { generateQRCodeMatrix } from "./qrcode.mjs";
import { sanitizeExampleSentence } from "./spellingCore.mjs";

function toWinAnsi(str) {
  const map = {
    "’": "'", "‘": "'", "“": '"', "”": '"', "—": "-", "–": "-",
    "•": "*", "…": "...", "·": "-", "≈": "~", "：": ": ", "，": ", ",
    "（": " (", "）": ")", "。": ". ", "、": ", "
  };
  return String(str || "")
    .replace(/[’‘“”——•…·≈：，（）。、]/g, (ch) => map[ch] || ch)
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ");
}

export class SimplePdfWriter {
  constructor() {
    this.stream = [];
    this.fonts = {
      Helvetica: "/Helvetica",
      HelveticaBold: "/Helvetica-Bold",
      HelveticaOblique: "/Helvetica-Oblique",
    };
  }

  rect(x, y, w, h, fill = false, stroke = true, colorRgb = [0, 0, 0]) {
    this.stream.push(`q`);
    if (fill) this.stream.push(`${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} rg`);
    if (stroke) this.stream.push(`${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} RG`);
    const op = fill && stroke ? "B" : fill ? "f" : "S";
    this.stream.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${op}`);
    this.stream.push(`Q`);
  }

  line(x1, y1, x2, y2, width = 1, colorRgb = [0, 0, 0]) {
    this.stream.push(`q`);
    this.stream.push(`${width.toFixed(2)} w`);
    this.stream.push(`${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} RG`);
    this.stream.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m ${x2.toFixed(2)} ${y2.toFixed(2)} l S`);
    this.stream.push(`Q`);
  }

  text(str, x, y, size = 11, font = "Helvetica", colorRgb = [0, 0, 0]) {
    const fontName = this.fonts[font] || "/Helvetica";
    this.stream.push(`q`);
    this.stream.push(`${colorRgb[0]} ${colorRgb[1]} ${colorRgb[2]} rg`);
    this.stream.push(`BT`);
    this.stream.push(`${fontName} ${size} Tf`);
    this.stream.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    const noPlaceholders = String(str || "").replace(/\{[a-zA-Z0-9_-]+\}/g, "").replace(/\s{2,}/g, " ");
    const clean = toWinAnsi(noPlaceholders)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    this.stream.push(`(${clean}) Tj`);
    this.stream.push(`ET`);
    this.stream.push(`Q`);
  }

  watermark(str) {
    this.stream.push(`q`);
    this.stream.push(`0.88 0.88 0.88 rg`);
    this.stream.push(`BT`);
    this.stream.push(`/Helvetica-Bold 26 Tf`);
    // Rotate ~35 degrees across the center of Letter (612x792)
    this.stream.push(`0.819 0.574 -0.574 0.819 60 260 Tm`);
    const noPlaceholders = String(str || "").replace(/\{[a-zA-Z0-9_-]+\}/g, "").replace(/\s{2,}/g, " ");
    const clean = toWinAnsi(noPlaceholders)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
    this.stream.push(`(${clean}) Tj`);
    this.stream.push(`ET`);
    this.stream.push(`Q`);
  }

  drawQrCode(matrix, x, y, sizePt = 72) {
    const n = matrix.length;
    const pad = 2;
    const total = n + pad * 2;
    const cellSize = sizePt / total;

    this.stream.push(`q`);
    // white background
    this.rect(x, y, sizePt, sizePt, true, false, [1, 1, 1]);
    // black modules
    this.stream.push(`0 0 0 rg`);
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (matrix[r][c] === 1) {
          const cx = x + (c + pad) * cellSize;
          const cy = y + sizePt - (r + pad + 1) * cellSize;
          this.stream.push(`${cx.toFixed(2)} ${cy.toFixed(2)} ${(cellSize + 0.1).toFixed(2)} ${(cellSize + 0.1).toFixed(2)} re f`);
        }
      }
    }
    this.stream.push(`Q`);
  }

  build() {
    const contentStream = this.stream.join("\n");
    // Calculate byte length
    const encoder = new TextEncoder();
    const streamBytes = encoder.encode(contentStream);
    const contentLength = streamBytes.length;

    const parts = [];
    const offsets = [];
    let currentOffset = 0;

    const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
    const headerBytes = encoder.encode(header);
    parts.push(headerBytes);
    currentOffset += headerBytes.length;

    function addObj(str) {
      offsets.push(currentOffset);
      const b = encoder.encode(str + "\n");
      parts.push(b);
      currentOffset += b.length;
    }

    addObj("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
    addObj("2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj");
    addObj(
      "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /Helvetica 5 0 R /Helvetica-Bold 6 0 R /Helvetica-Oblique 7 0 R >> >> >>\nendobj"
    );
    addObj(`4 0 obj\n<< /Length ${contentLength} >>\nstream\n${contentStream}\nendstream\nendobj`);
    addObj("5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj");
    addObj("6 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj");
    addObj("7 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>\nendobj");

    const startXref = currentOffset;
    let xref = `xref\n0 8\n0000000000 65535 f \n`;
    for (let i = 0; i < 7; i++) {
      xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    xref += `trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    parts.push(encoder.encode(xref));

    const totalLength = parts.reduce((acc, p) => acc + p.length, 0);
    const result = new Uint8Array(totalLength);
    let pos = 0;
    for (const p of parts) {
      result.set(p, pos);
      pos += p.length;
    }
    return result;
  }
}

export function buildTakeHomePdf({ title, due, mode, words = [], studentUrl, copy }) {
  const pdf = new SimplePdfWriter();
  const slug = (title || "assignment").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Brand Header
  pdf.text("My Spelling Game", 36, 756, 16, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text(copy?.takeHomeTitle || "Take-Home Spelling List", 36, 738, 12, "HelveticaBold", [0.2, 0.2, 0.2]);
  pdf.line(36, 730, 576, 730, 1.2, [0.15, 0.45, 0.42]);

  // Assignment details
  pdf.text(`${copy?.assignment || "Assignment"}: ${title}`, 36, 712, 11, "HelveticaBold");
  const dueClean = due ? String(due).replace(/\{[a-zA-Z0-9_-]+\}/g, "").trim() : "";
  const dueLabel = (copy?.dueLabel || copy?.due || "Due").replace(/\{date\}|[:：]/g, "").trim();
  if (dueClean) pdf.text(`${dueLabel}: ${dueClean}`, 360, 712, 9, "Helvetica", [0.3, 0.3, 0.3]);
  pdf.text(`${copy?.mode || "Mode"}: ${mode || "Dictation"}`, 36, 698, 9, "Helvetica", [0.4, 0.4, 0.4]);

  // Table header
  pdf.line(36, 684, 576, 684, 0.8, [0.8, 0.8, 0.8]);
  pdf.text(copy?.wordListHeader || "Spelling Words & Sentences", 36, 672, 9, "HelveticaBold");
  pdf.text(copy?.practiceLinesHeader || "Practice Writing (Dictation Lines)", 320, 672, 9, "HelveticaBold");
  pdf.line(36, 665, 576, 665, 0.8, [0.8, 0.8, 0.8]);

  const list = words.slice(0, 25);
  const isCompact = list.length > 12;
  let y = 648;
  const rowHeight = isCompact ? Math.max(18, Math.floor(520 / list.length)) : 36;

  list.forEach((item, index) => {
    const wordText = typeof item === "string" ? item : item.word;
    const rawSentence = typeof item === "string" ? "" : item.example_sentence;
    const sentence = sanitizeExampleSentence(rawSentence) || "";

    pdf.text(`${index + 1}. ${wordText}`, 36, y, 10, "HelveticaBold");
    if (!isCompact && sentence) {
      pdf.text(sentence.slice(0, 52), 48, y - 11, 8, "HelveticaOblique", [0.4, 0.4, 0.4]);
    }
    // Dictation handwriting line
    pdf.text(`${index + 1}.`, 320, y, 9, "HelveticaBold", [0.5, 0.5, 0.5]);
    pdf.line(338, y - 2, 576, y - 2, 0.8, [0.65, 0.65, 0.65]);
    y -= rowHeight;
  });

  // Footer area
  pdf.line(36, 118, 576, 118, 1, [0.8, 0.8, 0.8]);
  if (studentUrl) {
    const qr = generateQRCodeMatrix(studentUrl);
    pdf.drawQrCode(qr, 36, 36, 72);
  }
  pdf.text(copy?.practiceOnlineTitle || "Practice Online (Free for Students)", 120, 94, 10, "HelveticaBold");
  pdf.text(copy?.scanOrVisit || "Scan the QR code or practice at:", 120, 81, 8.5, "Helvetica", [0.35, 0.35, 0.35]);
  if (studentUrl) {
    pdf.text(studentUrl.slice(0, 65), 120, 69, 8.5, "HelveticaBold", [0.15, 0.35, 0.7]);
  }
  pdf.text(
    copy?.printFooterNote || "Students practice free online * Teachers track results in Workspace",
    120,
    52,
    7.5,
    "Helvetica",
    [0.45, 0.45, 0.45]
  );
  pdf.text(
    copy?.printFooterTeacherCta || "Teachers: Unlock class results from $14.99/mo",
    120,
    40,
    7.5,
    "HelveticaBold",
    [0.15, 0.45, 0.3]
  );

  return {
    filename: `myspellinggame-${slug || "assignment"}-takehome.pdf`,
    bytes: pdf.build(),
  };
}

export function buildParentReportPdf({
  nickname,
  assignmentTitle,
  dateStr,
  accuracy = 0,
  correctCount = 0,
  totalCount = 0,
  missedWords = [],
  studentUrl,
  isFreeSample = false,
  copy,
}) {
  const pdf = new SimplePdfWriter();
  const studentSlug = (nickname || "student").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  // Brand Header
  pdf.text("My Spelling Game", 36, 756, 16, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text(copy?.parentReportTitle || "Student Spelling Progress Report", 36, 738, 12, "HelveticaBold", [0.2, 0.2, 0.2]);
  pdf.line(36, 730, 576, 730, 1.2, [0.15, 0.45, 0.42]);

  if (isFreeSample) {
    pdf.watermark(copy?.sampleWatermark || "SAMPLE - Teacher Plan $14.99/mo");
  }

  // Learner info
  pdf.text(`${copy?.student || "Student"}: ${nickname}`, 36, 710, 11, "HelveticaBold");
  pdf.text(`${copy?.assignment || "Assignment"}: ${assignmentTitle}`, 36, 694, 9.5, "Helvetica", [0.2, 0.2, 0.2]);
  if (dateStr) pdf.text(`${copy?.date || "Date"}: ${dateStr}`, 380, 710, 9, "Helvetica", [0.4, 0.4, 0.4]);

  // Score Box
  pdf.rect(36, 620, 540, 58, true, true, [0.95, 0.97, 0.97]);
  pdf.text(`${accuracy}%`, 52, 638, 26, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text(copy?.accuracy || "Accuracy", 125, 652, 10, "HelveticaBold");
  pdf.text(`${correctCount} / ${totalCount} ${copy?.correctWords || "words spelled correctly"}`, 125, 636, 9, "Helvetica", [0.35, 0.35, 0.35]);

  // Missed Words Section
  let y = 590;
  pdf.line(36, y + 10, 576, y + 10, 0.8, [0.8, 0.8, 0.8]);
  pdf.text(copy?.wordsToReview || "Words to Review This Week", 36, y - 2, 11, "HelveticaBold");
  pdf.text(
    copy?.reviewAdvice || "Practice these words 2-3 times this week for mastery.",
    36,
    y - 16,
    8.5,
    "HelveticaOblique",
    [0.4, 0.4, 0.4]
  );

  y -= 36;
  const wordsToPractice = (missedWords.length ? missedWords : ["(No missed words - perfect score!)"]).slice(0, 10);
  wordsToPractice.forEach((word, idx) => {
    pdf.rect(36, y - 2, 10, 10, false, true, [0.5, 0.5, 0.5]);
    pdf.text(`${idx + 1}. ${word}`, 54, y, 9.5, "HelveticaBold");
    pdf.line(220, y - 2, 576, y - 2, 0.6, [0.75, 0.75, 0.75]);
    y -= 26;
  });

  // Footer / Re-practice section
  pdf.line(36, 120, 576, 120, 1, [0.8, 0.8, 0.8]);
  if (studentUrl) {
    const qr = generateQRCodeMatrix(studentUrl);
    pdf.drawQrCode(qr, 36, 36, 72);
  }
  pdf.text(copy?.practiceAgainTitle || "Practice Again Online", 120, 94, 10, "HelveticaBold");
  pdf.text(copy?.scanToPracticeAgain || "Scan or visit to retry this assignment:", 120, 81, 8.5, "Helvetica", [0.35, 0.35, 0.35]);
  if (studentUrl) {
    pdf.text(studentUrl.slice(0, 65), 120, 69, 8.5, "HelveticaBold", [0.15, 0.35, 0.7]);
  }

  if (isFreeSample) {
    pdf.text(
      copy?.sampleFooterNotice || "SAMPLE - Full unwatermarked parent reports available on Teacher Plan - $14.99/mo",
      120,
      44,
      8,
      "HelveticaBold",
      [0.6, 0.2, 0.2]
    );
  } else {
    pdf.text(
      copy?.printFooterNote || "Students practice free online * Teachers track results in Workspace",
      120,
      44,
      7.5,
      "Helvetica",
      [0.45, 0.45, 0.45]
    );
  }

  return {
    filename: `myspellinggame-${studentSlug}-parent-report.pdf`,
    bytes: pdf.build(),
  };
}

export function buildMissedWordsPdf({ assignmentTitle, words = [], studentUrl, isFreeSample = false, copy }) {
  const pdf = new SimplePdfWriter();
  const slug = isFreeSample ? "sample" : (assignmentTitle || "assignment").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  if (isFreeSample) {
    pdf.watermark(copy?.sampleMissedWordsWatermark || "SAMPLE - Teacher Plan - $14.99/mo");
  }

  pdf.text("My Spelling Game", 36, 756, 16, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text(copy?.missedWordsSheetTitle || "Missed Words Practice Sheet", 36, 738, 12, "HelveticaBold", [0.2, 0.2, 0.2]);
  pdf.line(36, 730, 576, 730, 1.2, [0.15, 0.45, 0.42]);

  pdf.text(`${copy?.assignment || "Assignment"}: ${assignmentTitle}`, 36, 712, 10.5, "HelveticaBold");
  pdf.text(
    copy?.lookCoverWriteCheck || "Look - Say - Cover - Write - Check",
    36,
    696,
    9,
    "HelveticaOblique",
    [0.4, 0.4, 0.4]
  );

  // Table header
  pdf.line(36, 682, 576, 682, 0.8, [0.8, 0.8, 0.8]);
  pdf.text(copy?.targetWord || "Missed Word", 36, 670, 9, "HelveticaBold");
  pdf.text(copy?.practiceAttempt1 || "Practice 1", 200, 670, 9, "HelveticaBold");
  pdf.text(copy?.practiceAttempt2 || "Practice 2", 330, 670, 9, "HelveticaBold");
  pdf.text(copy?.practiceAttempt3 || "Practice 3", 460, 670, 9, "HelveticaBold");
  pdf.line(36, 663, 576, 663, 0.8, [0.8, 0.8, 0.8]);

  const list = (words.length ? words : ["example", "practice", "spelling"]).slice(0, 14);
  let y = 646;
  list.forEach((item, index) => {
    const wordText = typeof item === "string" ? item : item.word;
    pdf.text(`${index + 1}. ${wordText}`, 36, y, 9.5, "HelveticaBold");
    pdf.line(195, y - 2, 310, y - 2, 0.6, [0.7, 0.7, 0.7]);
    pdf.line(325, y - 2, 440, y - 2, 0.6, [0.7, 0.7, 0.7]);
    pdf.line(455, y - 2, 570, y - 2, 0.6, [0.7, 0.7, 0.7]);
    y -= 34;
  });

  pdf.line(36, 118, 576, 118, 1, [0.8, 0.8, 0.8]);
  if (studentUrl) {
    const qr = generateQRCodeMatrix(studentUrl);
    pdf.drawQrCode(qr, 36, 36, 72);
  }
  pdf.text(copy?.practiceOnlineTitle || "Practice Online (Free for Students)", 120, 94, 10, "HelveticaBold");
  pdf.text(copy?.scanOrVisit || "Scan the QR code or practice at:", 120, 81, 8.5, "Helvetica", [0.35, 0.35, 0.35]);
  if (studentUrl) {
    pdf.text(studentUrl.slice(0, 65), 120, 69, 8.5, "HelveticaBold", [0.15, 0.35, 0.7]);
  }
  if (isFreeSample) {
    pdf.text(
      copy?.sampleMissedWordsNotice || "Sample - Full class-wide missed word sheets available on Teacher Plan - $14.99/mo",
      120,
      44,
      8,
      "HelveticaBold",
      [0.6, 0.2, 0.2]
    );
  } else {
    pdf.text(
      copy?.printFooterNote || "Students practice free online * Teachers track results in Workspace",
      120,
      52,
      7.5,
      "Helvetica",
      [0.45, 0.45, 0.45]
    );
    pdf.text(
      copy?.printFooterTeacherCta || "Teachers: Unlock class results from $14.99/mo",
      120,
      40,
      7.5,
      "HelveticaBold",
      [0.15, 0.45, 0.3]
    );
  }

  return {
    filename: `myspellinggame-${slug}-missed-words.pdf`,
    bytes: pdf.build(),
  };
}

export function buildClassroomGuidePdf({ copy }) {
  const pdf = new SimplePdfWriter();

  pdf.text("My Spelling Game", 36, 756, 16, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text(copy?.classroomGuideTitle || "Google Classroom Spelling in 3 Easy Steps", 36, 738, 12, "HelveticaBold", [0.2, 0.2, 0.2]);
  pdf.line(36, 730, 576, 730, 1.2, [0.15, 0.45, 0.42]);

  // Step 1
  pdf.rect(36, 600, 540, 105, false, true, [0.8, 0.8, 0.8]);
  pdf.rect(36, 680, 540, 25, true, false, [0.93, 0.96, 0.96]);
  pdf.text("STEP 1: Create Your Assignment", 48, 688, 10.5, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text("1. Go to Workspace -> Create Assignment.", 48, 662, 9, "Helvetica");
  pdf.text("2. Type or paste your weekly spelling list (or use Photo Import).", 48, 646, 9, "Helvetica");
  pdf.text("3. Choose practice mode (Dictation or Typing Chase) and set a due date.", 48, 630, 9, "Helvetica");
  pdf.text("4. Click 'Publish Assignment'.", 48, 614, 9, "Helvetica");

  // Step 2
  pdf.rect(36, 475, 540, 105, false, true, [0.8, 0.8, 0.8]);
  pdf.rect(36, 555, 540, 25, true, false, [0.93, 0.96, 0.96]);
  pdf.text("STEP 2: Share to Google Classroom", 48, 563, 10.5, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text("1. Click 'Share to Google Classroom' on the assignment detail page.", 48, 537, 9, "Helvetica");
  pdf.text("2. Select your Google Classroom course and action (Create assignment).", 48, 521, 9, "Helvetica");
  pdf.text("3. Students click the assignment link and practice instantly without login.", 48, 505, 9, "Helvetica");
  pdf.text("4. On Free, you can still copy the practice link into your Google Classroom post.", 48, 489, 9, "Helvetica");

  // Step 3
  pdf.rect(36, 350, 540, 105, false, true, [0.8, 0.8, 0.8]);
  pdf.rect(36, 430, 540, 25, true, false, [0.93, 0.96, 0.96]);
  pdf.text("STEP 3: Friday Results & Class Missed Words", 48, 438, 10.5, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text("1. Open Workspace -> View Assignment.", 48, 412, 9, "Helvetica");
  pdf.text("2. View each student's completion, accuracy score, and time taken.", 48, 396, 9, "Helvetica");
  pdf.text("3. Check 'Class Missed Words' to see which words need class review.", 48, 380, 9, "Helvetica");
  pdf.text("4. Print 1-page parent reports or export results to CSV.", 48, 364, 9, "Helvetica");

  // Upgrade banner
  pdf.rect(36, 160, 540, 160, true, true, [0.97, 0.98, 0.99]);
  pdf.text("Upgrade to Teacher Plan - $14.99/mo (or $149.90/yr)", 52, 296, 11, "HelveticaBold", [0.15, 0.45, 0.42]);
  pdf.text("* One-click Google Classroom sharing for whole class", 52, 276, 9, "Helvetica");
  pdf.text("* Per-student individual results, attempts and timestamps", 52, 260, 9, "Helvetica");
  pdf.text("* Class-wide missed words analytics and Smart Review generator", 52, 244, 9, "Helvetica");
  pdf.text("* Export student grades to CSV for your gradebook", 52, 228, 9, "Helvetica");
  pdf.text("* Print unwatermarked parent progress reports", 52, 212, 9, "Helvetica");
  pdf.text("Learn more at: https://myspellinggame.com/pricing?from=print_classroom&plan=teacher&interval=month", 52, 185, 8.5, "HelveticaBold", [0.15, 0.35, 0.7]);

  // Footer
  pdf.line(36, 120, 576, 120, 1, [0.8, 0.8, 0.8]);
  const qr = generateQRCodeMatrix("https://myspellinggame.com/pricing?from=print_classroom&plan=teacher&interval=month");
  pdf.drawQrCode(qr, 36, 36, 72);
  pdf.text("Teacher Plan from $14.99/mo", 120, 90, 10, "HelveticaBold");
  pdf.text("Scan to view Teacher Plan features or visit:", 120, 76, 8.5, "Helvetica", [0.35, 0.35, 0.35]);
  pdf.text("https://myspellinggame.com/pricing?from=print_classroom", 120, 62, 8.5, "HelveticaBold", [0.15, 0.35, 0.7]);
  pdf.text("My Spelling Game * Trusted by teachers & parents worldwide", 120, 44, 7.5, "Helvetica", [0.45, 0.45, 0.45]);

  return {
    filename: "myspellinggame-classroom-guide.pdf",
    bytes: pdf.build(),
  };
}

export function downloadPdfFile(pdfBytes, filename) {
  if (typeof window === "undefined") return;
  const blob = new Blob([pdfBytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    a.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}
