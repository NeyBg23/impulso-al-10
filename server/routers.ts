import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { createAuditLog } from "./audit";
import {
  createClient, getClients, getClientById, updateClient,
  createLoan, getLoans, getLoanById, getLoansByClient, updateLoan,
  createInstallments, getInstallmentsByLoan, getInstallmentById, getOverdueInstallments, updateInstallment,
  createPayment, getPayments, getPaymentById, updatePayment,
  createPenalty, getPenalties, getPenaltyById, updatePenalty,
  createDocument, getDocumentsByClient, deleteDocument,
  createConsent, getConsentsByClient,
  getAuditLogs,
  createCollection, getCollectionsByClient,
  getAllSettings, getSetting, upsertSetting,
  getDashboardStats,
  getAllUsers,
} from "./db";
import { storagePut } from "./storage";
import { nanoid } from "nanoid";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function adminOnly(ctx: { user: { role: string } | null }) {
  if (!ctx.user || ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden realizar esta acción" });
  }
}

function getIp(ctx: { req: { headers: Record<string, string | string[] | undefined> } }) {
  const forwarded = ctx.req.headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) return forwarded[0] ?? null;
  return (forwarded?.split(",")[0] ?? null);
}

// ─── FINANCIAL ENGINE ────────────────────────────────────────────────────────
function calculateLoan(principal: number, interestRate: number, termMonths: number, frequency: "weekly" | "biweekly" | "monthly") {
  const totalInterest = principal * (interestRate / 100) * termMonths;
  const totalAmount = principal + totalInterest;
  const installmentCount = frequency === "weekly" ? termMonths * 4 : frequency === "biweekly" ? termMonths * 2 : termMonths;
  const installmentAmount = Math.ceil(totalAmount / installmentCount);
  return { totalInterest, totalAmount, installmentCount, installmentAmount };
}

function generateDueDates(firstDueDate: Date, count: number, frequency: "weekly" | "biweekly" | "monthly"): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(firstDueDate);
    if (frequency === "weekly") d.setDate(d.getDate() + i * 7);
    else if (frequency === "biweekly") d.setDate(d.getDate() + i * 14);
    else d.setMonth(d.getMonth() + i);
    dates.push(d);
  }
  return dates;
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
    listUsers: protectedProcedure.query(async ({ ctx }) => {
      adminOnly(ctx);
      return getAllUsers();
    }),
  }),

  // ─── SETTINGS ──────────────────────────────────────────────────────────────
  settings: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      adminOnly(ctx);
      return getAllSettings();
    }),
    get: protectedProcedure.input(z.object({ key: z.string() })).query(async ({ input }) => {
      return getSetting(input.key);
    }),
    update: protectedProcedure.input(z.object({ key: z.string(), value: z.string() })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const prev = await getSetting(input.key);
      await upsertSetting(input.key, input.value, ctx.user!.id);
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "UPDATE_SETTING", entity: "settings",
        previousValues: prev ? { value: prev.value } : null,
        newValues: { key: input.key, value: input.value },
        ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
  }),

  // ─── CLIENTS ───────────────────────────────────────────────────────────────
  clients: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional() })).query(async ({ input }) => {
      return getClients(input.status);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const client = await getClientById(input.id);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      return client;
    }),
    create: protectedProcedure.input(z.object({
      fullName: z.string().min(2),
      documentType: z.enum(["CC", "CE", "NIT", "PASAPORTE"]),
      documentNumber: z.string().min(5),
      phone: z.string().min(7),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      occupation: z.string().optional().nullable(),
      reference1Name: z.string().optional().nullable(),
      reference1Phone: z.string().optional().nullable(),
      reference1Relation: z.string().optional().nullable(),
      reference2Name: z.string().optional().nullable(),
      reference2Phone: z.string().optional().nullable(),
      reference2Relation: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const result = await createClient({ ...input, createdBy: ctx.user!.id });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "CREATE_CLIENT", entity: "clients",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: input, ipAddress: getIp(ctx),
      });
      return result;
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      fullName: z.string().min(2).optional(),
      phone: z.string().optional(),
      email: z.string().email().optional().nullable(),
      address: z.string().optional().nullable(),
      city: z.string().optional().nullable(),
      occupation: z.string().optional().nullable(),
      reference1Name: z.string().optional().nullable(),
      reference1Phone: z.string().optional().nullable(),
      reference1Relation: z.string().optional().nullable(),
      reference2Name: z.string().optional().nullable(),
      reference2Phone: z.string().optional().nullable(),
      reference2Relation: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const prev = await getClientById(input.id);
      const { id, ...data } = input;
      await updateClient(id, data);
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "UPDATE_CLIENT", entity: "clients", entityId: id,
        previousValues: prev as Record<string, unknown>, newValues: data, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
    changeStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["pending", "validated", "approved", "blocked"]),
      notes: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const prev = await getClientById(input.id);
      await updateClient(input.id, { status: input.status, notes: input.notes });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: `CLIENT_STATUS_${input.status.toUpperCase()}`, entity: "clients", entityId: input.id,
        previousValues: { status: prev?.status }, newValues: { status: input.status }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
  }),

  // ─── LOANS ─────────────────────────────────────────────────────────────────
  loans: router({
    list: protectedProcedure.input(z.object({ status: z.string().optional(), clientId: z.number().optional() })).query(async ({ input }) => {
      if (input.clientId) return getLoansByClient(input.clientId);
      return getLoans(input.status);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const loan = await getLoanById(input.id);
      if (!loan) throw new TRPCError({ code: "NOT_FOUND", message: "Préstamo no encontrado" });
      return loan;
    }),
    calculate: protectedProcedure.input(z.object({
      principal: z.number().positive(),
      interestRate: z.number().positive(),
      termMonths: z.number().int().positive(),
      frequency: z.enum(["weekly", "biweekly", "monthly"]),
    })).query(async ({ input }) => {
      return calculateLoan(input.principal, input.interestRate, input.termMonths, input.frequency);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number(),
      principal: z.number().positive(),
      termMonths: z.number().int().positive(),
      frequency: z.enum(["weekly", "biweekly", "monthly"]),
      disbursementDate: z.string(),
      firstDueDate: z.string(),
      notes: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const client = await getClientById(input.clientId);
      if (!client) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente no encontrado" });
      if (client.status !== "approved") throw new TRPCError({ code: "BAD_REQUEST", message: "El cliente debe estar aprobado para crear un préstamo" });

      const rateSetting = await getSetting("interest_rate");
      const interestRate = parseFloat(rateSetting?.value ?? "10");
      const { totalInterest, totalAmount, installmentCount, installmentAmount } = calculateLoan(input.principal, interestRate, input.termMonths, input.frequency);

      const loanResult = await createLoan({
        clientId: input.clientId,
        principal: input.principal.toString(),
        interestRate: interestRate.toString(),
        termMonths: input.termMonths,
        frequency: input.frequency,
        totalInterest: totalInterest.toString(),
        totalAmount: totalAmount.toString(),
        installmentCount,
        installmentAmount: installmentAmount.toString(),
        disbursementDate: new Date(input.disbursementDate),
        firstDueDate: new Date(input.firstDueDate),
        notes: input.notes,
        createdBy: ctx.user!.id,
      });

      const loanId = (loanResult as { insertId?: number })?.insertId;

      // Generate installments automatically
      const dueDates = generateDueDates(new Date(input.firstDueDate), installmentCount, input.frequency);
      const installmentsData = dueDates.map((dueDate, i) => ({
        loanId: loanId!,
        installmentNumber: i + 1,
        dueDate,
        amount: installmentAmount.toString(),
        paidAmount: "0",
      }));
      await createInstallments(installmentsData);

      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "CREATE_LOAN", entity: "loans", entityId: loanId,
        newValues: { ...input, interestRate, totalInterest, totalAmount, installmentCount, installmentAmount },
        ipAddress: getIp(ctx),
      });
      return { loanId, installmentCount, installmentAmount, totalAmount, totalInterest };
    }),
    updateStatus: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["active", "paid", "overdue", "cancelled"]),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const prev = await getLoanById(input.id);
      await updateLoan(input.id, { status: input.status });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: `LOAN_STATUS_${input.status.toUpperCase()}`, entity: "loans", entityId: input.id,
        previousValues: { status: prev?.status }, newValues: { status: input.status }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
  }),

  // ─── INSTALLMENTS ──────────────────────────────────────────────────────────
  installments: router({
    byLoan: protectedProcedure.input(z.object({ loanId: z.number() })).query(async ({ input }) => {
      return getInstallmentsByLoan(input.loanId);
    }),
    overdue: protectedProcedure.query(async () => {
      return getOverdueInstallments();
    }),
    markOverdue: protectedProcedure.mutation(async ({ ctx }) => {
      adminOnly(ctx);
      const now = new Date();
      const pending = await getOverdueInstallments();
      let updated = 0;
      for (const inst of pending) {
        if (inst.dueDate < now && inst.status === "pending") {
          await updateInstallment(inst.id, { status: "overdue" });
          updated++;
        }
      }
      return { updated };
    }),
  }),

  // ─── PAYMENTS ──────────────────────────────────────────────────────────────
  payments: router({
    list: protectedProcedure.input(z.object({ loanId: z.number().optional() })).query(async ({ input }) => {
      return getPayments(input.loanId);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      const payment = await getPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      return payment;
    }),
    register: protectedProcedure.input(z.object({
      loanId: z.number(),
      installmentId: z.number().optional().nullable(),
      amount: z.number().positive(),
      paymentDate: z.string(),
      paymentMethod: z.string().optional().nullable(),
      reference: z.string().optional().nullable(),
      receiptUrl: z.string().optional().nullable(),
      notes: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const result = await createPayment({
        loanId: input.loanId,
        installmentId: input.installmentId,
        amount: input.amount.toString(),
        paymentDate: new Date(input.paymentDate),
        paymentMethod: input.paymentMethod,
        reference: input.reference,
        receiptUrl: input.receiptUrl,
        notes: input.notes,
        registeredBy: ctx.user!.id,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REGISTER_PAYMENT", entity: "payments",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: input, ipAddress: getIp(ctx),
      });
      return result;
    }),
    verify: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().optional() })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const payment = await getPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      if (payment.isReversed) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago ya fue revertido" });
      await updatePayment(input.id, { status: "verified", verifiedBy: ctx.user!.id, verifiedAt: new Date(), notes: input.notes });
      // Update installment if linked
      if (payment.installmentId) {
        const inst = await getInstallmentById(payment.installmentId);
        if (inst) {
          const newPaid = parseFloat(inst.paidAmount) + parseFloat(payment.amount);
          const newStatus = newPaid >= parseFloat(inst.amount) ? "paid" : "partial";
          await updateInstallment(inst.id, { paidAmount: newPaid.toString(), status: newStatus, paidAt: newStatus === "paid" ? new Date() : undefined });
        }
      }
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "VERIFY_PAYMENT", entity: "payments", entityId: input.id,
        previousValues: { status: payment.status }, newValues: { status: "verified" }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
    reject: protectedProcedure.input(z.object({ id: z.number(), notes: z.string().min(1) })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const payment = await getPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      await updatePayment(input.id, { status: "rejected", notes: input.notes });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REJECT_PAYMENT", entity: "payments", entityId: input.id,
        previousValues: { status: payment.status }, newValues: { status: "rejected", notes: input.notes }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
    reverse: protectedProcedure.input(z.object({ id: z.number(), reason: z.string().min(5) })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const payment = await getPaymentById(input.id);
      if (!payment) throw new TRPCError({ code: "NOT_FOUND", message: "Pago no encontrado" });
      if (payment.isReversed) throw new TRPCError({ code: "BAD_REQUEST", message: "El pago ya fue revertido" });
      await updatePayment(input.id, {
        status: "reversed", isReversed: true,
        reversedBy: ctx.user!.id, reversedAt: new Date(), reversalReason: input.reason,
      });
      // Revert installment paid amount
      if (payment.installmentId && payment.status === "verified") {
        const inst = await getInstallmentById(payment.installmentId);
        if (inst) {
          const newPaid = Math.max(0, parseFloat(inst.paidAmount) - parseFloat(payment.amount));
          const newStatus = newPaid <= 0 ? "pending" : "partial";
          await updateInstallment(inst.id, { paidAmount: newPaid.toString(), status: newStatus, paidAt: undefined });
        }
      }
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REVERSE_PAYMENT", entity: "payments", entityId: input.id,
        previousValues: { status: payment.status, isReversed: false },
        newValues: { status: "reversed", isReversed: true, reason: input.reason }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
    uploadReceipt: protectedProcedure.input(z.object({
      paymentId: z.number(),
      fileBase64: z.string(),
      fileName: z.string(),
      mimeType: z.string(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `receipts/${input.paymentId}-${nanoid(8)}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      await updatePayment(input.paymentId, { receiptUrl: url });
      return { url };
    }),
  }),

  // ─── PENALTIES ─────────────────────────────────────────────────────────────
  penalties: router({
    list: protectedProcedure.input(z.object({ loanId: z.number().optional() })).query(async ({ input }) => {
      return getPenalties(input.loanId);
    }),
    create: protectedProcedure.input(z.object({
      loanId: z.number(),
      installmentId: z.number(),
      amount: z.number().positive(),
      reason: z.string().min(10, "El motivo debe tener al menos 10 caracteres"),
      daysOverdue: z.number().int().positive(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const result = await createPenalty({
        loanId: input.loanId,
        installmentId: input.installmentId,
        amount: input.amount.toString(),
        reason: input.reason,
        daysOverdue: input.daysOverdue,
        appliedBy: ctx.user!.id,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "APPLY_PENALTY", entity: "penalties",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: input, ipAddress: getIp(ctx),
      });
      return result;
    }),
    reverse: protectedProcedure.input(z.object({ id: z.number(), reason: z.string().min(5) })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const penalty = await getPenaltyById(input.id);
      if (!penalty) throw new TRPCError({ code: "NOT_FOUND", message: "Recargo no encontrado" });
      if (penalty.isReversed) throw new TRPCError({ code: "BAD_REQUEST", message: "El recargo ya fue revertido" });
      await updatePenalty(input.id, {
        status: "reversed", isReversed: true,
        reversedBy: ctx.user!.id, reversedAt: new Date(), reversalReason: input.reason,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REVERSE_PENALTY", entity: "penalties", entityId: input.id,
        previousValues: { status: penalty.status }, newValues: { status: "reversed", reason: input.reason }, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
  }),

  // ─── DOCUMENTS ─────────────────────────────────────────────────────────────
  documents: router({
    byClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => {
      return getDocumentsByClient(input.clientId);
    }),
    upload: protectedProcedure.input(z.object({
      clientId: z.number(),
      loanId: z.number().optional().nullable(),
      type: z.enum(["id_front", "id_back", "selfie", "receipt", "contract", "other"]),
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
      fileSize: z.number().optional(),
      description: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const buffer = Buffer.from(input.fileBase64, "base64");
      const key = `documents/${input.clientId}/${input.type}-${nanoid(8)}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      const result = await createDocument({
        clientId: input.clientId,
        loanId: input.loanId,
        type: input.type,
        fileName: input.fileName,
        fileUrl: url,
        fileKey: key,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        description: input.description,
        uploadedBy: ctx.user!.id,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "UPLOAD_DOCUMENT", entity: "documents",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: { clientId: input.clientId, type: input.type, fileName: input.fileName }, ipAddress: getIp(ctx),
      });
      return { url, key };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      await deleteDocument(input.id);
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "DELETE_DOCUMENT", entity: "documents", entityId: input.id, ipAddress: getIp(ctx),
      });
      return { success: true };
    }),
  }),

  // ─── LEGAL CONSENTS ────────────────────────────────────────────────────────
  consents: router({
    byClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => {
      return getConsentsByClient(input.clientId);
    }),
    register: protectedProcedure.input(z.object({
      clientId: z.number(),
      consentType: z.enum(["terms", "data_policy", "identity_auth"]),
      deviceInfo: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      const ip = getIp(ctx);
      const userAgent = ctx.req.headers["user-agent"] as string | undefined;
      const result = await createConsent({
        clientId: input.clientId,
        consentType: input.consentType,
        ipAddress: ip,
        userAgent: userAgent ?? null,
        deviceInfo: input.deviceInfo,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REGISTER_CONSENT", entity: "legal_consents",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: { clientId: input.clientId, consentType: input.consentType }, ipAddress: ip,
      });
      return result;
    }),
  }),

  // ─── AUDIT ─────────────────────────────────────────────────────────────────
  audit: router({
    list: protectedProcedure.input(z.object({
      limit: z.number().int().positive().max(500).default(100),
      entity: z.string().optional(),
    })).query(async ({ ctx, input }) => {
      adminOnly(ctx);
      return getAuditLogs(input.limit, input.entity);
    }),
  }),

  // ─── COLLECTIONS ───────────────────────────────────────────────────────────
  collections: router({
    byClient: protectedProcedure.input(z.object({ clientId: z.number() })).query(async ({ input }) => {
      return getCollectionsByClient(input.clientId);
    }),

    register: protectedProcedure.input(z.object({
      clientId: z.number(),
      loanId: z.number(),
      contactType: z.enum(["call", "message", "visit", "email", "other"]),
      contactDate: z.string(),
      result: z.enum(["contacted", "no_answer", "promised_payment", "refused", "other"]),
      notes: z.string().optional().nullable(),
      nextContactDate: z.string().optional().nullable(),
    })).mutation(async ({ ctx, input }) => {
      adminOnly(ctx);
      const result = await createCollection({
        clientId: input.clientId,
        loanId: input.loanId,
        contactType: input.contactType,
        contactDate: new Date(input.contactDate),
        result: input.result,
        notes: input.notes,
        nextContactDate: input.nextContactDate ? new Date(input.nextContactDate) : null,
        registeredBy: ctx.user!.id,
      });
      await createAuditLog({
        userId: ctx.user!.id, userName: ctx.user!.name,
        action: "REGISTER_COLLECTION", entity: "collections",
        entityId: (result as { insertId?: number })?.insertId,
        newValues: input, ipAddress: getIp(ctx),
      });
      return result;
    }),
  }),

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────
  dashboard: router({
    stats: protectedProcedure.query(async ({ ctx }) => {
      adminOnly(ctx);
      return getDashboardStats();
    }),
  }),
});

export type AppRouter = typeof appRouter;
