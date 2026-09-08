import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY = "#1e3a5f";
const TEXT_H = "#0f172a";
const TEXT = "#334155";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const STRIPE = "#f8fafc";

export interface RosterPdfRow {
  name: string;
  cells: string[];
}

export interface RosterPdfOptions {
  businessName?: string;
  weekLabel: string;
  dayHeaders: string[];
  rows: RosterPdfRow[];
  generatedByLine: string;
  employeeColumnLabel: string;
  fileName: string;
  emptyCellText: string;
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const res = await fetch("/icon-192.png");
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadRosterPdf(opts: RosterPdfOptions): Promise<void> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  // Header band
  doc.setFillColor(NAVY);
  doc.rect(0, 0, pageWidth, 24, "F");

  let textX = margin;
  if (logo) {
    doc.addImage(logo, "PNG", margin, 5, 14, 14);
    textX = margin + 14 + 4;
  }
  doc.setTextColor("#ffffff");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Shiftline", textX, 14);

  if (opts.businessName) {
    const brandWidth = doc.getTextWidth("Shiftline");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor("#cbd5e1");
    doc.text(`· ${opts.businessName}`, textX + brandWidth + 3, 14);
  }

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(TEXT_H);
  doc.text("Weekly Roster", margin, 33);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(TEXT);
  doc.text(opts.weekLabel, margin, 39.5);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(opts.generatedByLine, pageWidth - margin, 33, { align: "right" });

  doc.setDrawColor(BORDER);
  doc.line(margin, 43, pageWidth - margin, 43);

  autoTable(doc, {
    startY: 48,
    margin: { left: margin, right: margin },
    head: [[opts.employeeColumnLabel, ...opts.dayHeaders]],
    body: opts.rows.map((r) => [r.name, ...r.cells]),
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3.5,
      lineColor: BORDER,
      lineWidth: 0.2,
      textColor: TEXT,
      valign: "middle",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: "#ffffff",
      fontStyle: "bold",
      halign: "center",
      fontSize: 9.5,
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: TEXT_H, halign: "left", cellWidth: 42 },
    },
    bodyStyles: { halign: "center" },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index > 0 && data.cell.raw === opts.emptyCellText) {
        data.cell.styles.textColor = MUTED;
        data.cell.styles.fontStyle = "italic";
      }
    },
  });

  const pageCount = doc.getNumberOfPages();
  const printedOn = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(MUTED);
    doc.setFont("helvetica", "normal");
    doc.text(`Shiftline · Printed ${printedOn}`, margin, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, {
      align: "right",
    });
  }

  doc.save(opts.fileName);
}
