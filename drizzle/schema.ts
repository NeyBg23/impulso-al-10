import {
  pgTable,
  pgEnum,
  serial,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const clientStatusEnum = pgEnum("client_status", ["pending", "validated", "approved", "blocked"]);
export const documentTypeEnum = pgEnum("document_type_enum", ["CC", "CE", "NIT", "PASAPORTE", "TI"]);
export const loanStatusEnum = pgEnum("loan_status", ["active", "paid", "overdue", "cancelled"]);
export const loanFrequencyEnum = pgEnum("loan_frequency", ["weekly", "biweekly", "monthly"]);
export const installmentStatusEnum = pgEnum("installment_status", ["pending", "paid", "overdue", "partial"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "verified", "rejected", "reversed"]);
export const penaltyStatusEnum = pgEnum("penalty_status", ["active", "paid", "reversed"]);
export const docTypeEnum = pgEnum("doc_type", ["id_front", "id_back", "selfie", "receipt", "contract", "other"]);
export const consentTypeEnum = pgEnum("consent_type", ["terms", "data_policy", "identity_auth"]);
export const contactTypeEnum = pgEnum("contact_type", ["call", "message", "visit", "email", "other"]);
export const contactResultEnum = pgEnum("contact_result", ["contacted", "no_answer", "promised_payment", "refused", "other"]);

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Settings ─────────────────────────────────────────────────────────────────

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  updatedBy: integer("updatedBy"),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = typeof settings.$inferInsert;

// ─── Clients ──────────────────────────────────────────────────────────────────

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  fullName: varchar("fullName", { length: 200 }).notNull(),
  documentType: documentTypeEnum("documentType").default("CC").notNull(),
  documentNumber: varchar("documentNumber", { length: 30 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }).notNull(),
  email: varchar("email", { length: 320 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  occupation: varchar("occupation", { length: 150 }),
  reference1Name: varchar("reference1Name", { length: 200 }),
  reference1Phone: varchar("reference1Phone", { length: 20 }),
  reference1Relation: varchar("reference1Relation", { length: 100 }),
  reference2Name: varchar("reference2Name", { length: 200 }),
  reference2Phone: varchar("reference2Phone", { length: 20 }),
  reference2Relation: varchar("reference2Relation", { length: 100 }),
  status: clientStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

// ─── Loans ────────────────────────────────────────────────────────────────────

export const loans = pgTable("loans", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  principal: numeric("principal", { precision: 15, scale: 2 }).notNull(),
  interestRate: numeric("interestRate", { precision: 5, scale: 2 }).notNull(),
  termMonths: integer("termMonths").notNull(),
  frequency: loanFrequencyEnum("frequency").notNull(),
  totalInterest: numeric("totalInterest", { precision: 15, scale: 2 }).notNull(),
  totalAmount: numeric("totalAmount", { precision: 15, scale: 2 }).notNull(),
  installmentCount: integer("installmentCount").notNull(),
  installmentAmount: numeric("installmentAmount", { precision: 15, scale: 2 }).notNull(),
  status: loanStatusEnum("status").default("active").notNull(),
  disbursementDate: timestamp("disbursementDate").defaultNow().notNull(),
  firstDueDate: timestamp("firstDueDate").notNull(),
  notes: text("notes"),
  createdBy: integer("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [index("loans_client_idx").on(t.clientId)]);

export type Loan = typeof loans.$inferSelect;
export type InsertLoan = typeof loans.$inferInsert;

// ─── Installments ─────────────────────────────────────────────────────────────

export const installments = pgTable("installments", {
  id: serial("id").primaryKey(),
  loanId: integer("loanId").notNull(),
  installmentNumber: integer("installmentNumber").notNull(),
  dueDate: timestamp("dueDate").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paidAmount: numeric("paidAmount", { precision: 15, scale: 2 }).default("0").notNull(),
  status: installmentStatusEnum("status").default("pending").notNull(),
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [index("installments_loan_idx").on(t.loanId)]);

export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = typeof installments.$inferInsert;

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  loanId: integer("loanId").notNull(),
  installmentId: integer("installmentId"),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  paymentDate: timestamp("paymentDate").defaultNow().notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  reference: varchar("reference", { length: 100 }),
  receiptUrl: text("receiptUrl"),
  status: paymentStatusEnum("status").default("pending").notNull(),
  notes: text("notes"),
  isReversed: boolean("isReversed").default(false).notNull(),
  reversedBy: integer("reversedBy"),
  reversedAt: timestamp("reversedAt"),
  reversalReason: text("reversalReason"),
  registeredBy: integer("registeredBy"),
  verifiedBy: integer("verifiedBy"),
  verifiedAt: timestamp("verifiedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [index("payments_loan_idx").on(t.loanId)]);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ─── Penalties ────────────────────────────────────────────────────────────────

export const penalties = pgTable("penalties", {
  id: serial("id").primaryKey(),
  loanId: integer("loanId").notNull(),
  installmentId: integer("installmentId").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  daysOverdue: integer("daysOverdue").notNull(),
  status: penaltyStatusEnum("status").default("active").notNull(),
  isReversed: boolean("isReversed").default(false).notNull(),
  reversedBy: integer("reversedBy"),
  reversedAt: timestamp("reversedAt"),
  reversalReason: text("reversalReason"),
  appliedBy: integer("appliedBy").notNull(),
  appliedAt: timestamp("appliedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [index("penalties_loan_idx").on(t.loanId)]);

export type Penalty = typeof penalties.$inferSelect;
export type InsertPenalty = typeof penalties.$inferInsert;

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  loanId: integer("loanId"),
  type: docTypeEnum("type").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: integer("fileSize"),
  description: text("description"),
  uploadedBy: integer("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("documents_client_idx").on(t.clientId)]);

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Legal Consents ───────────────────────────────────────────────────────────

export const legalConsents = pgTable("legal_consents", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  consentType: consentTypeEnum("consentType").notNull(),
  accepted: boolean("accepted").default(true).notNull(),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  deviceInfo: text("deviceInfo"),
  acceptedAt: timestamp("acceptedAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("consents_client_idx").on(t.clientId)]);

export type LegalConsent = typeof legalConsents.$inferSelect;
export type InsertLegalConsent = typeof legalConsents.$inferInsert;

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("userId"),
  userName: varchar("userName", { length: 200 }),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 100 }).notNull(),
  entityId: integer("entityId"),
  previousValues: jsonb("previousValues"),
  newValues: jsonb("newValues"),
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (t) => [index("audit_entity_idx").on(t.entity, t.entityId)]);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── Collections ──────────────────────────────────────────────────────────────

export const collections = pgTable("collections", {
  id: serial("id").primaryKey(),
  clientId: integer("clientId").notNull(),
  loanId: integer("loanId").notNull(),
  contactType: contactTypeEnum("contactType").notNull(),
  contactDate: timestamp("contactDate").defaultNow().notNull(),
  result: contactResultEnum("result").notNull(),
  notes: text("notes"),
  nextContactDate: timestamp("nextContactDate"),
  registeredBy: integer("registeredBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
}, (t) => [index("collections_client_idx").on(t.clientId)]);

export type Collection = typeof collections.$inferSelect;
export type InsertCollection = typeof collections.$inferInsert;
