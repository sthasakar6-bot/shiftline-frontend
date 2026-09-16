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

export interface RosterPdfSection {
  // Shown as a sub-heading above this section's table -- e.g. the week's
  // date range, so a multi-week (month) export still reads clearly with
  // no ambiguity about which table is which week.
  label: string;
  dayHeaders: string[];
  rows: RosterPdfRow[];
}

export interface RosterPdfOptions {
  businessName?: string;
  // Top title, e.g. "Weekly Roster" for a single week or "September 2026"
  // for a month export.
  title: string;
  sections: RosterPdfSection[];
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

function drawHeaderBand(doc: jsPDF, pageWidth: number, margin: number, logo: string | null, businessName?: string) {
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

  if (businessName) {
    const brandWidth = doc.getTextWidth("Shiftline");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor("#cbd5e1");
    doc.text(`· ${businessName}`, textX + brandWidth + 3, 14);
  }
}

export async function downloadRosterPdf(opts: RosterPdfOptions): Promise<void> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;

  drawHeaderBand(doc, pageWidth, margin, logo, opts.businessName);

  // Title block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(TEXT_H);
  doc.text(opts.title, margin, 33);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(opts.generatedByLine, pageWidth - margin, 33, { align: "right" });

  doc.setDrawColor(BORDER);
  doc.line(margin, 39, pageWidth - margin, 39);

  opts.sections.forEach((section, i) => {
    if (i > 0) {
      doc.addPage();
      drawHeaderBand(doc, pageWidth, margin, logo, opts.businessName);
    }
    const top = i === 0 ? 44 : 33;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.setTextColor(TEXT_H);
    doc.text(section.label, margin, top);

    autoTable(doc, {
      startY: top + 4,
      margin: { left: margin, right: margin },
      head: [[opts.employeeColumnLabel, ...section.dayHeaders]],
      body: section.rows.map((r) => [r.name, ...r.cells]),
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
