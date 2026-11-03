// HTML Sheet Templates for Print Preview and Browser Native Letter Print
// Designed for clean high-contrast black & white printing on Letter (8.5" x 11", 0.5" margins)

import { generateQRCodeMatrix, qrCodeToSvg } from "./qrcode.mjs";
import { sanitizeExampleSentence } from "./spellingCore.mjs";

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeTemplatePlaceholders(str) {
  return String(str || "").replace(/\{[a-zA-Z0-9_-]+\}/g, "");
}

function getDueLabel(copy) {
  if (copy?.dueLabel) return copy.dueLabel;
  if (copy?.due) {
    return copy.due.replace(/\{date\}|[:：]/g, "").trim();
  }
  return "Due";
}

export function renderTakeHomeSheetHtml({ title, due, mode, words = [], studentUrl, copy }) {
  const qrSvg = studentUrl ? qrCodeToSvg(generateQRCodeMatrix(studentUrl), 76) : "";
  const list = words.slice(0, 25);
  const isCompact = list.length > 12;
  const dueClean = due ? String(due).replace(/\{[a-zA-Z0-9_-]+\}/g, "").trim() : "";
  const dueLabel = getDueLabel(copy);

  let wordsHtml = "";
  list.forEach((item, index) => {
    const wordText = typeof item === "string" ? item : item.word;
    const rawSentence = typeof item === "string" ? "" : item.example_sentence;
    const sentence = sanitizeExampleSentence(rawSentence) || "";

    wordsHtml += `
      <div class="sheet-word-row">
        <div class="sheet-word-left">
          <span class="sheet-word-text">${index + 1}. ${escapeHtml(wordText)}</span>
          ${!isCompact && sentence ? `<div class="sheet-word-sentence">${escapeHtml(sentence)}</div>` : ""}
        </div>
        <div class="sheet-word-right">
          <span>${index + 1}.</span>
          <div class="sheet-dictation-line"></div>
        </div>
      </div>
    `;
  });

  const html = `
    <div class="sheet-brand-header">
      <div class="sheet-brand-name">My Spelling Game</div>
      <h1 class="sheet-title">${escapeHtml(copy?.takeHomeTitle || "Take-Home Spelling List")}</h1>
    </div>

    <div class="sheet-meta-grid">
      <div class="sheet-meta-item"><strong>${escapeHtml(copy?.assignment || "Assignment")}:</strong> ${escapeHtml(title)}</div>
      ${dueClean ? `<div class="sheet-meta-item"><strong>${escapeHtml(dueLabel)}:</strong> ${escapeHtml(dueClean)}</div>` : ""}
      <div class="sheet-meta-item"><strong>${escapeHtml(copy?.mode || "Mode")}:</strong> ${escapeHtml(mode || "Dictation")}</div>
    </div>

    <div class="sheet-table-header">
      <span>${escapeHtml(copy?.wordListHeader || "Spelling Words & Sentences")}</span>
      <span>${escapeHtml(copy?.practiceLinesHeader || "Practice Writing (Dictation Lines)")}</span>
    </div>

    <div class="sheet-words-container">
      ${wordsHtml}
    </div>

    <div class="sheet-footer">
      <div class="sheet-qr-box">${qrSvg}</div>
      <div class="sheet-footer-text">
        <div class="sheet-footer-title">${escapeHtml(copy?.practiceOnlineTitle || "Practice Online (Free for Students)")}</div>
        <div>${escapeHtml(copy?.scanOrVisit || "Scan the QR code or visit:")}</div>
        ${studentUrl ? `<div class="sheet-footer-url">${escapeHtml(studentUrl)}</div>` : ""}
        <div class="sheet-footer-notes">${escapeHtml(copy?.printFooterNote || "Students practice free online · Teachers track results in Workspace")}</div>
        <div class="sheet-footer-cta">${escapeHtml(copy?.printFooterTeacherCta || "Teachers: Unlock class results from $14.99/mo")}</div>
      </div>
    </div>
  `;
  return sanitizeTemplatePlaceholders(html);
}

export function renderParentReportSheetHtml({
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
  const qrSvg = studentUrl ? qrCodeToSvg(generateQRCodeMatrix(studentUrl), 76) : "";
  const wordsToPractice = (missedWords.length ? missedWords : ["(No missed words - 100% mastery!)"]).slice(0, 10);

  let missedHtml = "";
  wordsToPractice.forEach((word, idx) => {
    missedHtml += `
      <div class="sheet-missed-item">
        <div class="sheet-checkbox"></div>
        <div style="width: 140px; font-weight: 700;">${idx + 1}. ${escapeHtml(word)}</div>
        <div style="flex: 1; border-bottom: 1px solid #777; height: 1rem;"></div>
      </div>
    `;
  });

  return `
    ${isFreeSample ? `<div class="sheet-watermark" aria-hidden="true">${escapeHtml(copy?.sampleWatermark || "SAMPLE · Teacher Plan · $14.99/mo")}</div>` : ""}

    <div class="sheet-brand-header">
      <div class="sheet-brand-name">My Spelling Game</div>
      <h1 class="sheet-title">${escapeHtml(copy?.parentReportTitle || "Student Spelling Progress Report")}</h1>
    </div>

    <div class="sheet-meta-grid">
      <div class="sheet-meta-item"><strong>${escapeHtml(copy?.student || "Student")}:</strong> ${escapeHtml(nickname)}</div>
      <div class="sheet-meta-item"><strong>${escapeHtml(copy?.assignment || "Assignment")}:</strong> ${escapeHtml(assignmentTitle)}</div>
      ${dateStr ? `<div class="sheet-meta-item"><strong>${escapeHtml(copy?.date || "Date")}:</strong> ${escapeHtml(dateStr)}</div>` : ""}
    </div>

    <div class="sheet-score-card">
      <div class="sheet-score-big">${accuracy}%</div>
      <div class="sheet-score-detail">
        <strong>${escapeHtml(copy?.accuracy || "Accuracy")}</strong>
        <span>${correctCount} / ${totalCount} ${escapeHtml(copy?.correctWords || "words spelled correctly")}</span>
      </div>
    </div>

    <div class="sheet-section-title">${escapeHtml(copy?.wordsToReview || "Words to Review This Week")}</div>
    <p class="sheet-advice">${escapeHtml(copy?.reviewAdvice || "Practice these words 2–3 times this week for mastery.")}</p>

    <div class="sheet-missed-list">
      ${missedHtml}
    </div>

    <div class="sheet-footer">
      <div class="sheet-qr-box">${qrSvg}</div>
      <div class="sheet-footer-text">
        <div class="sheet-footer-title">${escapeHtml(copy?.practiceAgainTitle || "Practice Again Online")}</div>
        <div>${escapeHtml(copy?.scanToPracticeAgain || "Scan or visit to retry this assignment:")}</div>
        ${studentUrl ? `<div class="sheet-footer-url">${escapeHtml(studentUrl)}</div>` : ""}
        ${
          isFreeSample
            ? `<div class="sheet-sample-footer">${escapeHtml(copy?.sampleFooterNotice || "Sample — Full unwatermarked parent reports available on Teacher Plan · $14.99/mo")}</div>`
            : `<div class="sheet-footer-notes">${escapeHtml(copy?.printFooterNote || "Students practice free online · Teachers track results in Workspace")}</div>`
        }
      </div>
    </div>
  `;
  return sanitizeTemplatePlaceholders(html);
}

export function renderMissedWordsSheetHtml({
  assignmentTitle,
  words = [],
  studentUrl,
  isFreeSample = false,
  copy,
}) {
  const qrSvg = studentUrl ? qrCodeToSvg(generateQRCodeMatrix(studentUrl), 76) : "";
  const list = (words.length ? words : ["example", "practice", "spelling"]).slice(0, 14);

  let rowsHtml = "";
  list.forEach((item, index) => {
    const wordText = typeof item === "string" ? item : item.word;
    rowsHtml += `
      <div class="sheet-word-row">
        <div style="width: 140px; font-weight: 700;">${index + 1}. ${escapeHtml(wordText)}</div>
        <div style="flex: 1; display: flex; gap: 0.8rem;">
          <div style="flex: 1; border-bottom: 1.2px solid #555; height: 1.2rem;"></div>
          <div style="flex: 1; border-bottom: 1.2px solid #555; height: 1.2rem;"></div>
          <div style="flex: 1; border-bottom: 1.2px solid #555; height: 1.2rem;"></div>
        </div>
      </div>
    `;
  });

  const html = `
    ${isFreeSample ? `<div class="sheet-watermark" aria-hidden="true">${escapeHtml(copy?.sampleMissedWordsWatermark || "SAMPLE · Teacher Plan · $14.99/mo")}</div>` : ""}

    <div class="sheet-brand-header">
      <div class="sheet-brand-name">My Spelling Game</div>
      <h1 class="sheet-title">${escapeHtml(copy?.missedWordsSheetTitle || "Missed Words Practice Sheet")}</h1>
    </div>

    <div class="sheet-meta-grid">
      <div class="sheet-meta-item"><strong>${escapeHtml(copy?.assignment || "Assignment")}:</strong> ${escapeHtml(assignmentTitle)}</div>
      <div class="sheet-meta-item" style="font-style: italic; color: #555;">${escapeHtml(copy?.lookCoverWriteCheck || "Look — Say — Cover — Write — Check")}</div>
    </div>

    <div class="sheet-table-header">
      <span style="width: 140px;">${escapeHtml(copy?.targetWord || "Missed Word")}</span>
      <div style="flex: 1; display: flex; justify-content: space-around;">
        <span>${escapeHtml(copy?.practiceAttempt1 || "Practice 1")}</span>
        <span>${escapeHtml(copy?.practiceAttempt2 || "Practice 2")}</span>
        <span>${escapeHtml(copy?.practiceAttempt3 || "Practice 3")}</span>
      </div>
    </div>

    <div class="sheet-words-container">
      ${rowsHtml}
    </div>

    <div class="sheet-footer">
      <div class="sheet-qr-box">${qrSvg}</div>
      <div class="sheet-footer-text">
        <div class="sheet-footer-title">${escapeHtml(copy?.practiceOnlineTitle || "Practice Online (Free for Students)")}</div>
        <div>${escapeHtml(copy?.scanOrVisit || "Scan the QR code or practice at:")}</div>
        ${studentUrl ? `<div class="sheet-footer-url">${escapeHtml(studentUrl)}</div>` : ""}
        ${
          isFreeSample
            ? `<div class="sheet-sample-footer">${escapeHtml(copy?.sampleMissedWordsNotice || "Sample — Full class-wide missed word sheets available on Teacher Plan · $14.99/mo")}</div>`
            : `<div class="sheet-footer-notes">${escapeHtml(copy?.printFooterNote || "Students practice free online · Teachers track results in Workspace")}</div>`
        }
      </div>
    </div>
  `;
  return sanitizeTemplatePlaceholders(html);
}

export function renderClassroomGuideSheetHtml({ copy }) {
  const pricingUrl = "https://myspellinggame.com/pricing?from=print_classroom&plan=teacher&interval=month";
  const qrSvg = qrCodeToSvg(generateQRCodeMatrix(pricingUrl), 76);

  const html = `
    <div class="sheet-brand-header">
      <div class="sheet-brand-name">My Spelling Game</div>
      <h1 class="sheet-title">${escapeHtml(copy?.classroomGuideTitle || "Google Classroom Spelling in 3 Easy Steps")}</h1>
    </div>

    <div class="sheet-step-box">
      <div class="sheet-step-header">STEP 1: Create Your Assignment</div>
      <div class="sheet-step-body">
        <ol>
          <li>Open Workspace &rarr; Click <strong>Create Assignment</strong>.</li>
          <li>Paste or type your weekly spelling list (or use Photo Import).</li>
          <li>Select practice mode (Dictation or Typing Chase) and set a due date.</li>
          <li>Click <strong>Publish Assignment</strong>.</li>
        </ol>
      </div>
    </div>

    <div class="sheet-step-box">
      <div class="sheet-step-header">STEP 2: Share to Google Classroom</div>
      <div class="sheet-step-body">
        <ol>
          <li>Click <strong>Share to Google Classroom</strong> on the assignment detail page.</li>
          <li>Pick your Google Classroom course and action (Create assignment).</li>
          <li>Students click your link and practice immediately without login.</li>
          <li>On Free plan, you can still copy the practice link directly into your Classroom post.</li>
        </ol>
      </div>
    </div>

    <div class="sheet-step-box">
      <div class="sheet-step-header">STEP 3: Friday Results & Class Missed Words</div>
      <div class="sheet-step-body">
        <ol>
          <li>Open Workspace &rarr; View your assignment.</li>
          <li>Check each student's completion, accuracy score, and time taken.</li>
          <li>View <strong>Class Missed Words</strong> to see the words the whole class struggled with.</li>
          <li>Print 1-page parent progress reports or export grades to CSV.</li>
        </ol>
      </div>
    </div>

    <div class="sheet-step-box" style="border-color: #2f6f73; background: #fafdfd;">
      <div class="sheet-step-header" style="background: #eef6f5;">Teacher Plan — $14.99/mo (or $149.90/yr)</div>
      <div class="sheet-step-body">
        <ul style="margin: 0; padding-left: 1.2rem;">
          <li>One-click Google Classroom sharing for your entire class</li>
          <li>Per-student individual results, attempts, and accuracy tracking</li>
          <li>Class-wide missed words analytics and Smart Review generator</li>
          <li>Export student scores to CSV for your gradebook</li>
          <li>Print unwatermarked 1-page parent progress reports</li>
        </ul>
      </div>
    </div>

    <div class="sheet-footer">
      <div class="sheet-qr-box">${qrSvg}</div>
      <div class="sheet-footer-text">
        <div class="sheet-footer-title">Teacher Plan from $14.99/mo</div>
        <div>Scan to view Teacher Plan features or visit:</div>
        <div class="sheet-footer-url">https://myspellinggame.com/pricing?from=print_classroom</div>
        <div class="sheet-footer-notes">My Spelling Game · Trusted by teachers and parents worldwide</div>
      </div>
    </div>
  `;
  return sanitizeTemplatePlaceholders(html);
}
