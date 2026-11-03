// Print & PDF Preview Modal Controller
// Bridges client-side PDF download and browser native Letter print

import { downloadPdfFile } from "./pdfWriter.mjs";
import { trackEvent } from "./analytics.mjs";

export function showPrintModal({
  title,
  filename,
  renderSheetHtml,
  getPdfBytes,
  telemetryEvent,
  telemetryParams = {},
  isFreeSample = false,
  upgradeCta = null,
  copy,
}) {
  const existing = document.querySelector(".print-preview-dialog");
  if (existing) existing.remove();

  const dialog = document.createElement("dialog");
  dialog.className = "print-preview-dialog";
  dialog.setAttribute("aria-label", title);

  const header = document.createElement("div");
  header.className = "print-preview-toolbar";

  const modalTitle = document.createElement("h2");
  modalTitle.className = "print-preview-title";
  modalTitle.textContent = title;

  const actions = document.createElement("div");
  actions.className = "actions print-toolbar-actions";

  if (upgradeCta) {
    const upgradeLink = document.createElement("a");
    upgradeLink.className = "button-link button-primary print-upgrade-btn";
    upgradeLink.href = upgradeCta.href;
    upgradeLink.textContent = upgradeCta.label;
    upgradeLink.addEventListener("click", () => {
      trackEvent("upgrade_click", {
        source: upgradeCta.from || "print_parent_report",
        plan: "teacher",
        billing_interval: "month",
      });
    });
    actions.append(upgradeLink);
  }

  const downloadBtn = document.createElement("button");
  downloadBtn.type = "button";
  downloadBtn.className = isFreeSample ? "button-secondary print-download-btn" : "button-primary print-download-btn";
  downloadBtn.textContent = isFreeSample
    ? (copy?.downloadSamplePdf || "Download Sample PDF")
    : (copy?.downloadPdf || "Download PDF");
  downloadBtn.addEventListener("click", () => {
    if (telemetryEvent) trackEvent(telemetryEvent, telemetryParams);
    const bytes = getPdfBytes();
    downloadPdfFile(bytes, filename);
  });

  const printBtn = document.createElement("button");
  printBtn.type = "button";
  printBtn.className = "button-secondary print-now-btn";
  printBtn.textContent = isFreeSample
    ? (copy?.printSample || "Print Sample")
    : (copy?.print || "Print");
  printBtn.addEventListener("click", () => {
    if (telemetryEvent) trackEvent(telemetryEvent, telemetryParams);
    window.print();
  });

  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "button-secondary print-close-btn";
  closeBtn.textContent = copy?.close || "Close";
  closeBtn.addEventListener("click", () => dialog.close());

  actions.append(downloadBtn, printBtn, closeBtn);
  header.append(modalTitle, actions);

  const previewWrap = document.createElement("div");
  previewWrap.className = "print-sheet-scroll-wrap";

  const sheet = document.createElement("div");
  sheet.className = "print-sheet";
  sheet.innerHTML = renderSheetHtml();

  previewWrap.append(sheet);
  dialog.append(header, previewWrap);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => dialog.remove());

  document.body.append(dialog);
  dialog.showModal();
}
