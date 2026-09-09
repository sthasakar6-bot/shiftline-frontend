import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const NAVY = "#1e3a5f";
const TEXT_H = "#0f172a";
const TEXT = "#334155";
const MUTED = "#94a3b8";
const BORDER = "#e2e8f0";
const STRIPE = "#f8fafc";

export interface SummaryPdfShiftRow {
  date: string;
  start: string;
  end: string;
  breakMin: string;
  hours: string;
}

export interface SummaryPdfLeaveRow {
  type: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface SummaryPdfOptions {
  businessName?: string;
  employeeName: string;
  rangeLabel: string;
  generatedByLine: string;
  shiftsTitle: string;
  shiftsColumns: [string, string, string, string, string];
  shiftRows: SummaryPdfShiftRow[];
  totalHoursLabel: string;
  totalHours: string;
  noShiftsText: string;
  leaveTitle: string;
  leaveColumns: [string, string, string, string];
  leaveRows: SummaryPdfLeaveRow[];
  noLeaveText: string;
  fileName: string;
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

export async function downloadSummaryPdf(opts: SummaryPdfOptions): Promise<void> {
  const logo = await loadLogoDataUrl();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;

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

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(TEXT_H);
  doc.text(opts.employeeName, margin, 33);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(TEXT);
  doc.text(opts.rangeLabel, margin, 39.5);

  doc.setFontSize(9);
  doc.setTextColor(MUTED);
  doc.text(opts.generatedByLine, pageWidth - margin, 33, { align: "right" });

  doc.setDrawColor(BORDER);
  doc.line(margin, 43, pageWidth - margin, 43);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(TEXT_H);
  doc.text(opts.shiftsTitle, margin, 51);

  autoTable(doc, {
    startY: 55,
    margin: { left: margin, right: margin },
    head: [opts.shiftsColumns],
    body:
      opts.shiftRows.length > 0
        ? opts.shiftRows.map((r) => [r.date, r.start, r.end, r.breakMin, r.hours])
        : [[opts.noShiftsText, "", "", "", ""]],
    foot: opts.shiftRows.length > 0 ? [["", "", "", opts.totalHoursLabel, opts.totalHours]] : undefined,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 3.5,
      lineColor: BORDER,
      lineWidth: 0.2,
      textColor: TEXT,
      valign: "middle",
    },
    headStyles: { fillColor: NAVY, textColor: "#ffffff", fontStyle: "bold", fontSize: 9.5 },
    footStyles: { fillColor: STRIPE, textColor: TEXT_H, fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (data) => {
      if (data.section === "body" && data.cell.raw === opts.noShiftsText) {
        data.cell.styles.textColor = MUTED;
        data.cell.styles.fontStyle = "italic";
        data.cell.styles.halign = "center";
      }
    },
  });

  const afterShifts = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  const leaveStartY = afterShifts + 12;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(TEXT_H);
  doc.text(opts.leaveTitle, margin, leaveStartY);

  autoTable(doc, {
    startY: leaveStartY + 4,
    margin: { left: margin, right: margin },
    head: [opts.leaveColumns],
    body:
      opts.leaveRows.length > 0
        ? opts.leaveRows.map((r) => [r.type, r.startDate, r.endDate, r.status])
        : [[opts.noLeaveText, "", "", ""]],
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 3.5,
      lineColor: BORDER,
      lineWidth: 0.2,
      textColor: TEXT,
      valign: "middle",
    },
    headStyles: { fillColor: NAVY, textColor: "#ffffff", fontStyle: "bold", fontSize: 9.5 },
    alternateRowStyles: { fillColor: STRIPE },
    didParseCell: (data) => {
      if (data.section === "body" && data.cell.raw === opts.noLeaveText) {
        data.cell.styles.textColor = MUTED;
        data.cell.styles.fontStyle = "italic";
        data.cell.styles.halign = "center";
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
