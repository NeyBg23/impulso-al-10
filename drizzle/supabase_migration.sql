-- ============================================================
-- Impulso al 10 - Migración completa a Supabase (PostgreSQL)
-- ============================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('user', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE client_status AS ENUM ('pending', 'validated', 'approved', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE document_type_enum AS ENUM ('CC', 'CE', 'NIT', 'PASAPORTE', 'TI');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_status AS ENUM ('active', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE loan_frequency AS ENUM ('weekly', 'biweekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE installment_status AS ENUM ('pending', 'paid', 'overdue', 'partial');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'verified', 'rejected', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE penalty_status AS ENUM ('active', 'paid', 'reversed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE doc_type AS ENUM ('id_front', 'id_back', 'selfie', 'receipt', 'contract', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM ('terms', 'data_policy', 'identity_auth');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_type AS ENUM ('call', 'message', 'visit', 'email', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE contact_result AS ENUM ('contacted', 'no_answer', 'promised_payment', 'refused', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  role user_role NOT NULL DEFAULT 'user',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  description TEXT,
  "updatedBy" INTEGER,
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Clients
CREATE TABLE IF NOT EXISTS clients (
  id SERIAL PRIMARY KEY,
  "fullName" VARCHAR(200) NOT NULL,
  "documentType" document_type_enum NOT NULL DEFAULT 'CC',
  "documentNumber" VARCHAR(30) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(320),
  address TEXT,
  city VARCHAR(100),
  occupation VARCHAR(150),
  "reference1Name" VARCHAR(200),
  "reference1Phone" VARCHAR(20),
  "reference1Relation" VARCHAR(100),
  "reference2Name" VARCHAR(200),
  "reference2Phone" VARCHAR(20),
  "reference2Relation" VARCHAR(100),
  status client_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Loans
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL,
  principal NUMERIC(15,2) NOT NULL,
  "interestRate" NUMERIC(5,2) NOT NULL,
  "termMonths" INTEGER NOT NULL,
  frequency loan_frequency NOT NULL,
  "totalInterest" NUMERIC(15,2) NOT NULL,
  "totalAmount" NUMERIC(15,2) NOT NULL,
  "installmentCount" INTEGER NOT NULL,
  "installmentAmount" NUMERIC(15,2) NOT NULL,
  status loan_status NOT NULL DEFAULT 'active',
  "disbursementDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "firstDueDate" TIMESTAMP NOT NULL,
  notes TEXT,
  "createdBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS loans_client_idx ON loans ("clientId");

-- Installments
CREATE TABLE IF NOT EXISTS installments (
  id SERIAL PRIMARY KEY,
  "loanId" INTEGER NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "dueDate" TIMESTAMP NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  "paidAmount" NUMERIC(15,2) NOT NULL DEFAULT 0,
  status installment_status NOT NULL DEFAULT 'pending',
  "paidAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS installments_loan_idx ON installments ("loanId");

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id SERIAL PRIMARY KEY,
  "loanId" INTEGER NOT NULL,
  "installmentId" INTEGER,
  amount NUMERIC(15,2) NOT NULL,
  "paymentDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  "paymentMethod" VARCHAR(50),
  reference VARCHAR(100),
  "receiptUrl" TEXT,
  status payment_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  "isReversed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reversedBy" INTEGER,
  "reversedAt" TIMESTAMP,
  "reversalReason" TEXT,
  "registeredBy" INTEGER,
  "verifiedBy" INTEGER,
  "verifiedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS payments_loan_idx ON payments ("loanId");

-- Penalties
CREATE TABLE IF NOT EXISTS penalties (
  id SERIAL PRIMARY KEY,
  "loanId" INTEGER NOT NULL,
  "installmentId" INTEGER NOT NULL,
  amount NUMERIC(15,2) NOT NULL,
  reason TEXT NOT NULL,
  "daysOverdue" INTEGER NOT NULL,
  status penalty_status NOT NULL DEFAULT 'active',
  "isReversed" BOOLEAN NOT NULL DEFAULT FALSE,
  "reversedBy" INTEGER,
  "reversedAt" TIMESTAMP,
  "reversalReason" TEXT,
  "appliedBy" INTEGER NOT NULL,
  "appliedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS penalties_loan_idx ON penalties ("loanId");

-- Documents
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL,
  "loanId" INTEGER,
  type doc_type NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileKey" TEXT NOT NULL,
  "mimeType" VARCHAR(100),
  "fileSize" INTEGER,
  description TEXT,
  "uploadedBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS documents_client_idx ON documents ("clientId");

-- Legal Consents
CREATE TABLE IF NOT EXISTS legal_consents (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL,
  "consentType" consent_type NOT NULL,
  accepted BOOLEAN NOT NULL DEFAULT TRUE,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "deviceInfo" TEXT,
  "acceptedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS consents_client_idx ON legal_consents ("clientId");

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER,
  "userName" VARCHAR(200),
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  "entityId" INTEGER,
  "previousValues" JSONB,
  "newValues" JSONB,
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_logs (entity, "entityId");

-- Collections
CREATE TABLE IF NOT EXISTS collections (
  id SERIAL PRIMARY KEY,
  "clientId" INTEGER NOT NULL,
  "loanId" INTEGER NOT NULL,
  "contactType" contact_type NOT NULL,
  "contactDate" TIMESTAMP NOT NULL DEFAULT NOW(),
  result contact_result NOT NULL,
  notes TEXT,
  "nextContactDate" TIMESTAMP,
  "registeredBy" INTEGER,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS collections_client_idx ON collections ("clientId");

-- Default settings
INSERT INTO settings (key, value, description) VALUES
  ('interest_rate', '10', 'Tasa de interés mensual por defecto (%)'),
  ('min_loan_amount', '100000', 'Monto mínimo de préstamo (COP)'),
  ('max_loan_amount', '5000000', 'Monto máximo de préstamo (COP)'),
  ('default_term_months', '6', 'Plazo por defecto en meses')
ON CONFLICT (key) DO NOTHING;
