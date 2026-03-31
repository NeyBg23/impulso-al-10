import { eq, desc, and, lt, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
  InsertUser, users,
  clients, InsertClient,
  loans, InsertLoan,
  installments, InsertInstallment,
  payments, InsertPayment,
  penalties, InsertPenalty,
  documents, InsertDocument,
  legalConsents, InsertLegalConsent,
  auditLogs, InsertAuditLog,
  collections, InsertCollection,
  settings,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  const connStr = process.env.DATABASE_URL;
  if (!_db && connStr) {
    try {
      const client = postgres(connStr, { max: 10, ssl: "require" });
      _db = drizzle(client);
      console.log("[Database] Connected to PostgreSQL");
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ───────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    // PostgreSQL upsert using onConflictDoUpdate
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.openId,
      set: updateSet,
    });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

// ─── SETTINGS ────────────────────────────────────────────────────────────────

export async function getSetting(key: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(settings);
}

export async function upsertSetting(key: string, value: string, updatedBy?: number) {
  const db = await getDb();
  if (!db) return;
  await db.insert(settings).values({ key, value, updatedBy }).onConflictDoUpdate({
    target: settings.key,
    set: { value, updatedBy, updatedAt: new Date() },
  });
}

// ─── CLIENTS ─────────────────────────────────────────────────────────────────

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

export async function getClients(status?: string) {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(clients)
      .where(eq(clients.status, status as "pending" | "validated" | "approved" | "blocked"))
      .orderBy(desc(clients.createdAt));
  }
  return db.select().from(clients).orderBy(desc(clients.createdAt));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients).where(eq(clients.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateClient(id: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clients).set({ ...data, updatedAt: new Date() }).where(eq(clients.id, id));
}

// ─── LOANS ───────────────────────────────────────────────────────────────────

export async function createLoan(data: InsertLoan) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(loans).values(data).returning();
  return result[0];
}

export async function getLoans(status?: string, clientId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (status) conditions.push(eq(loans.status, status as "active" | "paid" | "overdue" | "cancelled"));
  if (clientId) conditions.push(eq(loans.clientId, clientId));
  if (conditions.length > 0) {
    return db.select().from(loans).where(and(...conditions)).orderBy(desc(loans.createdAt));
  }
  return db.select().from(loans).orderBy(desc(loans.createdAt));
}

export async function getLoanById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(loans).where(eq(loans.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getLoansByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(loans).where(eq(loans.clientId, clientId)).orderBy(desc(loans.createdAt));
}

export async function updateLoan(id: number, data: Partial<InsertLoan>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(loans).set({ ...data, updatedAt: new Date() }).where(eq(loans.id, id));
}

// ─── INSTALLMENTS ────────────────────────────────────────────────────────────

export async function createInstallments(data: InsertInstallment[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(installments).values(data);
}

export async function getInstallmentsByLoan(loanId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(installments)
    .where(eq(installments.loanId, loanId))
    .orderBy(installments.installmentNumber);
}

export async function getInstallmentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(installments).where(eq(installments.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getOverdueInstallments() {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  return db.select().from(installments).where(
    and(lt(installments.dueDate, now), eq(installments.status, "pending"))
  ).orderBy(installments.dueDate);
}

export async function updateInstallment(id: number, data: Partial<InsertInstallment>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(installments).set({ ...data, updatedAt: new Date() }).where(eq(installments.id, id));
}

// ─── PAYMENTS ────────────────────────────────────────────────────────────────

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(payments).values(data).returning();
  return result[0];
}

export async function getPayments(loanId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (loanId) {
    return db.select().from(payments).where(eq(payments.loanId, loanId)).orderBy(desc(payments.createdAt));
  }
  return db.select().from(payments).orderBy(desc(payments.createdAt));
}

export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(payments).where(eq(payments.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePayment(id: number, data: Partial<InsertPayment>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(payments).set({ ...data, updatedAt: new Date() }).where(eq(payments.id, id));
}

// ─── PENALTIES ───────────────────────────────────────────────────────────────

export async function createPenalty(data: InsertPenalty) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(penalties).values(data).returning();
  return result[0];
}

export async function getPenalties(loanId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (loanId) {
    return db.select().from(penalties).where(eq(penalties.loanId, loanId)).orderBy(desc(penalties.createdAt));
  }
  return db.select().from(penalties).orderBy(desc(penalties.createdAt));
}

export async function getPenaltyById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(penalties).where(eq(penalties.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updatePenalty(id: number, data: Partial<InsertPenalty>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(penalties).set({ ...data, updatedAt: new Date() }).where(eq(penalties.id, id));
}

// ─── DOCUMENTS ───────────────────────────────────────────────────────────────

export async function createDocument(data: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(documents).values(data).returning();
  return result[0];
}

export async function getDocumentsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.createdAt));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(documents).where(eq(documents.id, id));
}

// ─── LEGAL CONSENTS ──────────────────────────────────────────────────────────

export async function createConsent(data: InsertLegalConsent) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(legalConsents).values(data).returning();
  return result[0];
}

export async function getConsentsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(legalConsents).where(eq(legalConsents.clientId, clientId)).orderBy(desc(legalConsents.createdAt));
}

// ─── AUDIT LOGS ──────────────────────────────────────────────────────────────

export async function createAuditLog(data: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(data);
  } catch (e) {
    console.warn("[Audit] Failed to write audit log:", e);
  }
}

export async function getAuditLogs(limit = 100, entity?: string) {
  const db = await getDb();
  if (!db) return [];
  if (entity) {
    return db.select().from(auditLogs).where(eq(auditLogs.entity, entity)).orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
  return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(limit);
}

// ─── COLLECTIONS ─────────────────────────────────────────────────────────────

export async function createCollection(data: InsertCollection) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(collections).values(data).returning();
  return result[0];
}

export async function getCollectionsByClient(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(collections).where(eq(collections.clientId, clientId)).orderBy(desc(collections.createdAt));
}

// ─── DASHBOARD STATS ─────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return {
    totalLoans: 0, activeLoans: 0, paidLoans: 0, overdueLoans: 0,
    totalClients: 0, approvedClients: 0,
    totalPrincipal: "0", totalInterest: "0", totalCollected: "0",
    overdueInstallments: 0, totalPenalties: "0",
    recentPayments: [], overdueList: [],
  };

  const [loanStats] = await db.execute(sql`
    SELECT
      COUNT(*) as total_loans,
      COUNT(CASE WHEN status = 'active' THEN 1 END) as active_loans,
      COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_loans,
      COUNT(CASE WHEN status = 'overdue' THEN 1 END) as overdue_loans,
      COALESCE(SUM(CAST(principal AS NUMERIC)), 0) as total_principal,
      COALESCE(SUM(CAST(total_interest AS NUMERIC)), 0) as total_interest
    FROM loans
  `);

  const [clientStats] = await db.execute(sql`
    SELECT
      COUNT(*) as total_clients,
      COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_clients
    FROM clients
  `);

  const [paymentStats] = await db.execute(sql`
    SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_collected
    FROM payments WHERE status = 'verified'
  `);

  const [penaltyStats] = await db.execute(sql`
    SELECT COALESCE(SUM(CAST(amount AS NUMERIC)), 0) as total_penalties
    FROM penalties WHERE status = 'active'
  `);

  const [overdueCount] = await db.execute(sql`
    SELECT COUNT(*) as overdue_count FROM installments
    WHERE status = 'pending' AND due_date < NOW()
  `);

  const ls = loanStats as Record<string, unknown>;
  const cs = clientStats as Record<string, unknown>;
  const ps = paymentStats as Record<string, unknown>;
  const pens = penaltyStats as Record<string, unknown>;
  const oc = overdueCount as Record<string, unknown>;

  return {
    totalLoans: Number(ls.total_loans ?? 0),
    activeLoans: Number(ls.active_loans ?? 0),
    paidLoans: Number(ls.paid_loans ?? 0),
    overdueLoans: Number(ls.overdue_loans ?? 0),
    totalClients: Number(cs.total_clients ?? 0),
    approvedClients: Number(cs.approved_clients ?? 0),
    totalPrincipal: String(ls.total_principal ?? "0"),
    totalInterest: String(ls.total_interest ?? "0"),
    totalCollected: String(ps.total_collected ?? "0"),
    overdueInstallments: Number(oc.overdue_count ?? 0),
    totalPenalties: String(pens.total_penalties ?? "0"),
  };
}
