import PDFDocument from "pdfkit";
import type { Response } from "express";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ClientData {
  fullName: string;
  documentType: string;
  documentNumber: string;
  phone: string;
  email?: string | null;
  city?: string | null;
}

interface LoanData {
  id: number;
  principal: string | number;
  interestRate: string | number;
  termMonths: number;
  frequency: string;
  totalInterest: string | number;
  totalAmount: string | number;
  installmentCount: number;
  installmentAmount: string | number;
  status: string;
  disbursementDate: Date;
  firstDueDate: Date;
}

interface InstallmentData {
  installmentNumber: number;
  dueDate: Date;
  amount: string | number;
  paidAmount: string | number;
  status: string;
  paidAt?: Date | null;
}

interface PaymentData {
  id: number;
  amount: string | number;
  paymentDate: Date;
  paymentMethod?: string | null;
  reference?: string | null;
  status: string;
  isReversed: boolean;
}

interface PenaltyData {
  id: number;
  amount: string | number;
  reason: string;
  daysOverdue: number;
  status: string;
  appliedAt: Date;
}

interface StatementData {
  client: ClientData;
  loan: LoanData;
  installments: InstallmentData[];
  payments: PaymentData[];
  penalties: PenaltyData[];
  generatedAt: Date;
  generatedBy: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatCOP(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateShort(date: Date): string {
  return new Date(date).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: "Pendiente",
    paid: "Pagado",
    overdue: "En mora",
    partial: "Parcial",
    active: "Activo",
    cancelled: "Cancelado",
    verified: "Verificado",
    rejected: "Rechazado",
    reversed: "Revertido",
  };
  return map[status] ?? status;
}

function frequencyLabel(freq: string): string {
  const map: Record<string, string> = {
    weekly: "Semanal",
    biweekly: "Quincenal",
    monthly: "Mensual",
  };
  return map[freq] ?? freq;
}

// ─── PDF Generator ───────────────────────────────────────────────────────────

const BRAND_BLUE = "#1d4ed8";
const DARK = "#1e293b";
const GRAY = "#64748b";
const LIGHT_GRAY = "#f1f5f9";
const WHITE = "#ffffff";
const GREEN = "#16a34a";
const RED = "#dc2626";
const ORANGE = "#ea580c";

export async function generateLoanStatementPDF(
  data: StatementData,
  res: Response
): Promise<void> {
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
    info: {
      Title: `Estado de Cuenta - Préstamo #${data.loan.id}`,
      Author: "Impulso al 10",
      Subject: `Estado de cuenta para ${data.client.fullName}`,
    },
  });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="estado-cuenta-prestamo-${data.loan.id}.pdf"`
  );
  doc.pipe(res);

  const pageWidth = doc.page.width - 100; // margins
  const col1 = 50;

  // ─── HEADER ──────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill(BRAND_BLUE);

  doc
    .fontSize(22)
    .font("Helvetica-Bold")
    .fillColor(WHITE)
    .text("IMPULSO AL 10", col1, 22);

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#bfdbfe")
    .text("Sistema de Gestión de Préstamos", col1, 48);

  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .fillColor(WHITE)
    .text(`ESTADO DE CUENTA`, doc.page.width - 250, 22, { width: 200, align: "right" });

  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor("#bfdbfe")
    .text(`Préstamo #${data.loan.id}`, doc.page.width - 250, 44, { width: 200, align: "right" });

  doc
    .fontSize(9)
    .fillColor("#bfdbfe")
    .text(`Generado: ${formatDate(data.generatedAt)}`, doc.page.width - 250, 60, {
      width: 200,
      align: "right",
    });

  doc.moveDown(3.5);

  // ─── CLIENT INFO ─────────────────────────────────────────────────────────
  const sectionY = doc.y;
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("INFORMACIÓN DEL CLIENTE", col1, sectionY);

  doc
    .moveTo(col1, doc.y + 3)
    .lineTo(col1 + pageWidth, doc.y + 3)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);

  const infoY = doc.y;
  const halfW = pageWidth / 2 - 10;

  // Left column
  doc.fontSize(9).font("Helvetica-Bold").fillColor(GRAY).text("NOMBRE COMPLETO", col1, infoY);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(DARK)
    .text(data.client.fullName, col1, infoY + 13);

  doc
    .fontSize(9)
    .font("Helvetica-Bold")
    .fillColor(GRAY)
    .text("DOCUMENTO", col1, infoY + 33);
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(DARK)
    .text(
      `${data.client.documentType}: ${data.client.documentNumber}`,
      col1,
      infoY + 46
    );

  // Right column
  const col2 = col1 + halfW + 20;
  doc.fontSize(9).font("Helvetica-Bold").fillColor(GRAY).text("TELÉFONO", col2, infoY);
  doc.fontSize(10).font("Helvetica").fillColor(DARK).text(data.client.phone, col2, infoY + 13);

  if (data.client.city) {
    doc.fontSize(9).font("Helvetica-Bold").fillColor(GRAY).text("CIUDAD", col2, infoY + 33);
    doc
      .fontSize(10)
      .font("Helvetica")
      .fillColor(DARK)
      .text(data.client.city, col2, infoY + 46);
  }

  doc.moveDown(4.5);

  // ─── LOAN SUMMARY ────────────────────────────────────────────────────────
  const loanSectionY = doc.y;
  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("RESUMEN DEL PRÉSTAMO", col1, loanSectionY);

  doc
    .moveTo(col1, doc.y + 3)
    .lineTo(col1 + pageWidth, doc.y + 3)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);

  // Summary boxes
  const boxY = doc.y;
  const boxW = (pageWidth - 15) / 4;
  const boxes = [
    { label: "Capital", value: formatCOP(data.loan.principal), color: BRAND_BLUE },
    { label: "Interés Total", value: formatCOP(data.loan.totalInterest), color: ORANGE },
    { label: "Total a Pagar", value: formatCOP(data.loan.totalAmount), color: DARK },
    {
      label: "Estado",
      value: statusLabel(data.loan.status),
      color:
        data.loan.status === "paid"
          ? GREEN
          : data.loan.status === "overdue"
          ? RED
          : BRAND_BLUE,
    },
  ];

  boxes.forEach((box, i) => {
    const bx = col1 + i * (boxW + 5);
    doc.rect(bx, boxY, boxW, 52).fill(LIGHT_GRAY);
    doc
      .fontSize(8)
      .font("Helvetica-Bold")
      .fillColor(GRAY)
      .text(box.label.toUpperCase(), bx + 8, boxY + 8, { width: boxW - 16 });
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(box.color)
      .text(box.value, bx + 8, boxY + 22, { width: boxW - 16 });
  });

  doc.moveDown(4);

  // Loan details row
  const detailY = doc.y;
  const detailItems = [
    { label: "Tasa de interés", value: `${data.loan.interestRate}% mensual` },
    { label: "Plazo", value: `${data.loan.termMonths} meses` },
    { label: "Frecuencia", value: frequencyLabel(data.loan.frequency) },
    { label: "Cuotas", value: `${data.loan.installmentCount} de ${formatCOP(data.loan.installmentAmount)}` },
    { label: "Desembolso", value: formatDateShort(data.loan.disbursementDate) },
    { label: "1ra cuota", value: formatDateShort(data.loan.firstDueDate) },
  ];

  detailItems.forEach((item, i) => {
    const col = i % 3 === 0 ? col1 : i % 3 === 1 ? col1 + pageWidth / 3 + 5 : col1 + (pageWidth * 2) / 3 + 10;
    const row = Math.floor(i / 3);
    const dy = detailY + row * 28;
    doc.fontSize(8).font("Helvetica-Bold").fillColor(GRAY).text(item.label.toUpperCase(), col, dy);
    doc.fontSize(9).font("Helvetica").fillColor(DARK).text(item.value, col, dy + 11);
  });

  doc.moveDown(3.5);

  // ─── INSTALLMENTS TABLE ──────────────────────────────────────────────────
  if (doc.y > 600) doc.addPage();

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("TABLA DE CUOTAS", col1, doc.y);

  doc
    .moveTo(col1, doc.y + 3)
    .lineTo(col1 + pageWidth, doc.y + 3)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);

  // Table header
  const thY = doc.y;
  const cols = {
    num: { x: col1, w: 35 },
    due: { x: col1 + 35, w: 90 },
    amount: { x: col1 + 125, w: 90 },
    paid: { x: col1 + 215, w: 90 },
    balance: { x: col1 + 305, w: 90 },
    status: { x: col1 + 395, w: 60 },
  };

  doc.rect(col1, thY, pageWidth, 20).fill(DARK);
  doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
  doc.text("#", cols.num.x + 4, thY + 6, { width: cols.num.w });
  doc.text("VENCIMIENTO", cols.due.x + 4, thY + 6, { width: cols.due.w });
  doc.text("CUOTA", cols.amount.x + 4, thY + 6, { width: cols.amount.w });
  doc.text("PAGADO", cols.paid.x + 4, thY + 6, { width: cols.paid.w });
  doc.text("SALDO", cols.balance.x + 4, thY + 6, { width: cols.balance.w });
  doc.text("ESTADO", cols.status.x + 4, thY + 6, { width: cols.status.w });

  doc.moveDown(0.1);

  data.installments.forEach((inst, idx) => {
    if (doc.y > 720) {
      doc.addPage();
    }
    const rowY = doc.y;
    const bg = idx % 2 === 0 ? WHITE : LIGHT_GRAY;
    doc.rect(col1, rowY, pageWidth, 18).fill(bg);

    const statusColor =
      inst.status === "paid"
        ? GREEN
        : inst.status === "overdue"
        ? RED
        : inst.status === "partial"
        ? ORANGE
        : DARK;

    const balance =
      parseFloat(String(inst.amount)) - parseFloat(String(inst.paidAmount));

    doc.fontSize(8).font("Helvetica").fillColor(DARK);
    doc.text(String(inst.installmentNumber), cols.num.x + 4, rowY + 5, { width: cols.num.w });
    doc.text(formatDateShort(inst.dueDate), cols.due.x + 4, rowY + 5, { width: cols.due.w });
    doc.text(formatCOP(inst.amount), cols.amount.x + 4, rowY + 5, { width: cols.amount.w });
    doc.text(formatCOP(inst.paidAmount), cols.paid.x + 4, rowY + 5, { width: cols.paid.w });
    doc.text(formatCOP(balance > 0 ? balance : 0), cols.balance.x + 4, rowY + 5, { width: cols.balance.w });
    doc
      .fontSize(7)
      .font("Helvetica-Bold")
      .fillColor(statusColor)
      .text(statusLabel(inst.status).toUpperCase(), cols.status.x + 4, rowY + 5, {
        width: cols.status.w,
      });

    doc.moveDown(0.05);
  });

  doc.moveDown(1.5);

  // ─── PAYMENTS TABLE ──────────────────────────────────────────────────────
  if (doc.y > 620) doc.addPage();

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("HISTORIAL DE PAGOS", col1, doc.y);

  doc
    .moveTo(col1, doc.y + 3)
    .lineTo(col1 + pageWidth, doc.y + 3)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);

  if (data.payments.length === 0) {
    doc.fontSize(9).font("Helvetica").fillColor(GRAY).text("No hay pagos registrados.", col1, doc.y);
    doc.moveDown(1);
  } else {
    const pthY = doc.y;
    const pcols = {
      id: { x: col1, w: 35 },
      date: { x: col1 + 35, w: 95 },
      amount: { x: col1 + 130, w: 95 },
      method: { x: col1 + 225, w: 95 },
      ref: { x: col1 + 320, w: 90 },
      status: { x: col1 + 410, w: 45 },
    };

    doc.rect(col1, pthY, pageWidth, 20).fill(DARK);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
    doc.text("#", pcols.id.x + 4, pthY + 6, { width: pcols.id.w });
    doc.text("FECHA", pcols.date.x + 4, pthY + 6, { width: pcols.date.w });
    doc.text("MONTO", pcols.amount.x + 4, pthY + 6, { width: pcols.amount.w });
    doc.text("MÉTODO", pcols.method.x + 4, pthY + 6, { width: pcols.method.w });
    doc.text("REFERENCIA", pcols.ref.x + 4, pthY + 6, { width: pcols.ref.w });
    doc.text("ESTADO", pcols.status.x + 4, pthY + 6, { width: pcols.status.w });

    doc.moveDown(0.1);

    data.payments.forEach((pay, idx) => {
      if (doc.y > 720) doc.addPage();
      const rowY = doc.y;
      const bg = idx % 2 === 0 ? WHITE : LIGHT_GRAY;
      doc.rect(col1, rowY, pageWidth, 18).fill(bg);

      const statusColor =
        pay.isReversed ? GRAY : pay.status === "verified" ? GREEN : pay.status === "rejected" ? RED : ORANGE;

      doc.fontSize(8).font("Helvetica").fillColor(DARK);
      doc.text(String(pay.id), pcols.id.x + 4, rowY + 5, { width: pcols.id.w });
      doc.text(formatDateShort(pay.paymentDate), pcols.date.x + 4, rowY + 5, { width: pcols.date.w });
      doc.text(formatCOP(pay.amount), pcols.amount.x + 4, rowY + 5, { width: pcols.amount.w });
      doc.text(pay.paymentMethod ?? "—", pcols.method.x + 4, rowY + 5, { width: pcols.method.w });
      doc.text(pay.reference ?? "—", pcols.ref.x + 4, rowY + 5, { width: pcols.ref.w });
      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor(statusColor)
        .text(
          pay.isReversed ? "REVERT." : statusLabel(pay.status).toUpperCase(),
          pcols.status.x + 4,
          rowY + 5,
          { width: pcols.status.w }
        );

      doc.moveDown(0.05);
    });
  }

  doc.moveDown(1.5);

  // ─── PENALTIES TABLE ─────────────────────────────────────────────────────
  if (data.penalties.length > 0) {
    if (doc.y > 620) doc.addPage();

    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor(RED)
      .text("RECARGOS POR MORA", col1, doc.y);

    doc
      .moveTo(col1, doc.y + 3)
      .lineTo(col1 + pageWidth, doc.y + 3)
      .strokeColor(RED)
      .lineWidth(1.5)
      .stroke();

    doc.moveDown(0.8);

    const penthY = doc.y;
    const pencols = {
      id: { x: col1, w: 30 },
      date: { x: col1 + 30, w: 90 },
      amount: { x: col1 + 120, w: 90 },
      days: { x: col1 + 210, w: 50 },
      reason: { x: col1 + 260, w: 155 },
      status: { x: col1 + 415, w: 40 },
    };

    doc.rect(col1, penthY, pageWidth, 20).fill(DARK);
    doc.fontSize(8).font("Helvetica-Bold").fillColor(WHITE);
    doc.text("#", pencols.id.x + 4, penthY + 6, { width: pencols.id.w });
    doc.text("FECHA", pencols.date.x + 4, penthY + 6, { width: pencols.date.w });
    doc.text("MONTO", pencols.amount.x + 4, penthY + 6, { width: pencols.amount.w });
    doc.text("DÍAS", pencols.days.x + 4, penthY + 6, { width: pencols.days.w });
    doc.text("MOTIVO", pencols.reason.x + 4, penthY + 6, { width: pencols.reason.w });
    doc.text("ESTADO", pencols.status.x + 4, penthY + 6, { width: pencols.status.w });

    doc.moveDown(0.1);

    data.penalties.forEach((pen, idx) => {
      if (doc.y > 720) doc.addPage();
      const rowY = doc.y;
      const bg = idx % 2 === 0 ? WHITE : "#fff1f2";
      doc.rect(col1, rowY, pageWidth, 18).fill(bg);

      const statusColor = pen.status === "paid" ? GREEN : pen.status === "reversed" ? GRAY : RED;

      doc.fontSize(8).font("Helvetica").fillColor(DARK);
      doc.text(String(pen.id), pencols.id.x + 4, rowY + 5, { width: pencols.id.w });
      doc.text(formatDateShort(pen.appliedAt), pencols.date.x + 4, rowY + 5, { width: pencols.date.w });
      doc
        .font("Helvetica-Bold")
        .fillColor(RED)
        .text(formatCOP(pen.amount), pencols.amount.x + 4, rowY + 5, { width: pencols.amount.w });
      doc.font("Helvetica").fillColor(DARK).text(String(pen.daysOverdue), pencols.days.x + 4, rowY + 5, { width: pencols.days.w });
      doc.text(pen.reason, pencols.reason.x + 4, rowY + 5, { width: pencols.reason.w });
      doc
        .fontSize(7)
        .font("Helvetica-Bold")
        .fillColor(statusColor)
        .text(statusLabel(pen.status).toUpperCase(), pencols.status.x + 4, rowY + 5, {
          width: pencols.status.w,
        });

      doc.moveDown(0.05);
    });

    doc.moveDown(1.5);
  }

  // ─── FINANCIAL SUMMARY ───────────────────────────────────────────────────
  if (doc.y > 650) doc.addPage();

  doc
    .fontSize(11)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("RESUMEN FINANCIERO", col1, doc.y);

  doc
    .moveTo(col1, doc.y + 3)
    .lineTo(col1 + pageWidth, doc.y + 3)
    .strokeColor(BRAND_BLUE)
    .lineWidth(1.5)
    .stroke();

  doc.moveDown(0.8);

  const totalPaid = data.payments
    .filter((p) => p.status === "verified" && !p.isReversed)
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const totalPenalties = data.penalties
    .filter((p) => p.status === "active")
    .reduce((sum, p) => sum + parseFloat(String(p.amount)), 0);

  const balance =
    parseFloat(String(data.loan.totalAmount)) + totalPenalties - totalPaid;

  const summaryItems = [
    { label: "Total del préstamo (capital + interés):", value: formatCOP(data.loan.totalAmount), bold: false },
    { label: "Total pagado (pagos verificados):", value: formatCOP(totalPaid), bold: false, color: GREEN },
    { label: "Total recargos por mora:", value: formatCOP(totalPenalties), bold: false, color: totalPenalties > 0 ? RED : DARK },
    { label: "SALDO PENDIENTE:", value: formatCOP(balance > 0 ? balance : 0), bold: true, color: balance > 0 ? RED : GREEN },
  ];

  const sumY = doc.y;
  summaryItems.forEach((item, i) => {
    const iy = sumY + i * 22;
    if (i === summaryItems.length - 1) {
      doc.rect(col1, iy - 3, pageWidth, 22).fill(LIGHT_GRAY);
    }
    doc
      .fontSize(9)
      .font(item.bold ? "Helvetica-Bold" : "Helvetica")
      .fillColor(DARK)
      .text(item.label, col1 + 8, iy + 3, { width: pageWidth - 130 });
    doc
      .fontSize(9)
      .font("Helvetica-Bold")
      .fillColor(item.color ?? DARK)
      .text(item.value, col1 + pageWidth - 120, iy + 3, { width: 115, align: "right" });
  });

  doc.moveDown(5);

  // ─── FOOTER ──────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 60;
  doc.rect(0, footerY, doc.page.width, 60).fill(LIGHT_GRAY);

  doc
    .fontSize(8)
    .font("Helvetica")
    .fillColor(GRAY)
    .text(
      `Documento generado por Impulso al 10 el ${formatDate(data.generatedAt)} por ${data.generatedBy}. ` +
        `Este documento es de carácter informativo y no constituye un título valor.`,
      col1,
      footerY + 12,
      { width: pageWidth, align: "center" }
    );

  doc
    .fontSize(8)
    .font("Helvetica-Bold")
    .fillColor(BRAND_BLUE)
    .text("Impulso al 10 — Sistema de Gestión de Préstamos", col1, footerY + 36, {
      width: pageWidth,
      align: "center",
    });

  doc.end();
}
