import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import {
  getLoanById,
  getClientById,
  getInstallmentsByLoan,
  getPayments,
  getPenalties,
} from "./db";
import { generateLoanStatementPDF } from "./pdfGenerator";

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerPdfRoutes(app: Express) {
  /**
   * GET /api/pdf/loan/:id
   * Generates and streams a PDF statement for the given loan ID.
   * Requires authentication (session cookie).
   */
  app.get("/api/pdf/loan/:id", async (req: Request, res: Response) => {
    try {
      // Auth check using the same SDK used by tRPC context
      let user: Awaited<ReturnType<typeof sdk.authenticateRequest>> | null = null;
      try {
        user = await sdk.authenticateRequest(req);
      } catch {
        user = null;
      }
      if (!user) {
        res.status(401).json({ error: "No autorizado. Inicia sesión para descargar el estado de cuenta." });
        return;
      }

      const loanId = parseInt(req.params.id, 10);
      if (isNaN(loanId)) {
        res.status(400).json({ error: "ID de préstamo inválido." });
        return;
      }

      // Fetch all data in parallel
      const [loan, installments, payments, penalties] = await Promise.all([
        getLoanById(loanId),
        getInstallmentsByLoan(loanId),
        getPayments(loanId),
        getPenalties(loanId),
      ]);

      if (!loan) {
        res.status(404).json({ error: "Préstamo no encontrado." });
        return;
      }

      const client = await getClientById(loan.clientId);
      if (!client) {
        res.status(404).json({ error: "Cliente no encontrado." });
        return;
      }

      // Generate PDF
      await generateLoanStatementPDF(
        {
          client: {
            fullName: client.fullName,
            documentType: client.documentType,
            documentNumber: client.documentNumber,
            phone: client.phone,
            email: client.email,
            city: client.city,
          },
          loan: {
            id: loan.id,
            principal: loan.principal,
            interestRate: loan.interestRate,
            termMonths: loan.termMonths,
            frequency: loan.frequency,
            totalInterest: loan.totalInterest,
            totalAmount: loan.totalAmount,
            installmentCount: loan.installmentCount,
            installmentAmount: loan.installmentAmount,
            status: loan.status,
            disbursementDate: loan.disbursementDate,
            firstDueDate: loan.firstDueDate,
          },
          installments: installments.map((i) => ({
            installmentNumber: i.installmentNumber,
            dueDate: i.dueDate,
            amount: i.amount,
            paidAmount: i.paidAmount,
            status: i.status,
            paidAt: i.paidAt,
          })),
          payments: payments.map((p) => ({
            id: p.id,
            amount: p.amount,
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod,
            reference: p.reference,
            status: p.status,
            isReversed: p.isReversed,
          })),
          penalties: penalties.map((pen) => ({
            id: pen.id,
            amount: pen.amount,
            reason: pen.reason,
            daysOverdue: pen.daysOverdue,
            status: pen.status,
            appliedAt: pen.appliedAt,
          })),
          generatedAt: new Date(),
          generatedBy: user.name ?? user.email ?? "Administrador",
        },
        res
      );
    } catch (err) {
      console.error("[PDF] Error generating loan statement:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Error al generar el PDF. Intenta de nuevo." });
      }
    }
  });
}
