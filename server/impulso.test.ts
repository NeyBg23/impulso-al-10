import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock DB helpers ─────────────────────────────────────────────────────────
// These tests mock DB calls so they run without a real database connection.
vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getAllSettings: vi.fn().mockResolvedValue([
      { id: 1, key: "interest_rate", value: "10", description: "Tasa de interés mensual (%)" },
      { id: 2, key: "min_loan_amount", value: "100000", description: "Monto mínimo" },
    ]),
    getClients: vi.fn().mockResolvedValue([]),
    getPayments: vi.fn().mockResolvedValue([]),
    getAuditLogs: vi.fn().mockResolvedValue([]),
    getDashboardStats: vi.fn().mockResolvedValue({
      totalLoans: 0,
      activeLoans: 0,
      paidLoans: 0,
      overdueLoans: 0,
      totalClients: 0,
      approvedClients: 0,
      totalPrincipal: "0",
      totalInterest: "0",
      totalCollected: "0",
      overdueInstallments: 0,
      totalPenalties: "0",
      recentPayments: [],
      overdueList: [],
    }),
  };
});

// ─── Helpers ────────────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function makeCtx(role: "admin" | "user" = "admin"): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-open-id",
    email: "admin@impulso.test",
    name: "Admin Test",
    loginMethod: "manus",
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => {} } as unknown as TrpcContext["res"],
  };
}

// ─── Auth ────────────────────────────────────────────────────────────────────

describe("auth.me", () => {
  it("returns null for unauthenticated users", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated users", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.auth.me();
    expect(result).not.toBeNull();
    expect(result?.email).toBe("admin@impulso.test");
    expect(result?.role).toBe("admin");
  });
});

// ─── Financial Calculator ────────────────────────────────────────────────────

describe("loans.calculate", () => {
  it("calculates simple interest correctly for monthly frequency", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.loans.calculate({
      principal: 1_000_000,
      interestRate: 10,
      termMonths: 3,
      frequency: "monthly",
    });
    // 10% monthly simple interest: 1,000,000 * 10% * 3 = 300,000 interest
    expect(result.totalInterest).toBe(300_000);
    expect(result.totalAmount).toBe(1_300_000);
    expect(result.installmentCount).toBe(3);
    // installmentAmount is rounded up (Math.ceil) to cover total
    expect(result.installmentAmount).toBe(Math.ceil(1_300_000 / 3));
  });

  it("calculates weekly installments correctly", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.loans.calculate({
      principal: 500_000,
      interestRate: 10,
      termMonths: 1,
      frequency: "weekly",
    });
    // 1 month = ~4 weeks
    expect(result.installmentCount).toBe(4);
    expect(result.totalAmount).toBe(550_000); // 500k + 10%
  });

  it("calculates biweekly installments correctly", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.loans.calculate({
      principal: 600_000,
      interestRate: 10,
      termMonths: 2,
      frequency: "biweekly",
    });
    // 2 months = 4 biweekly periods
    expect(result.installmentCount).toBe(4);
    expect(result.totalInterest).toBe(120_000); // 600k * 10% * 2
  });

  it("rejects zero or negative principal", async () => {
    const caller = appRouter.createCaller(makeCtx());
    await expect(
      caller.loans.calculate({ principal: 0, interestRate: 10, termMonths: 3, frequency: "monthly" })
    ).rejects.toThrow();
  });
});

// ─── Settings ────────────────────────────────────────────────────────────────

describe("settings", () => {
  it("returns settings list for admin (mocked DB)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.settings.list();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("throws FORBIDDEN for non-admin users on update", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(
      caller.settings.update({ key: "interest_rate", value: "15" })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── Clients ─────────────────────────────────────────────────────────────────

describe("clients", () => {
  it("returns list (mocked DB, no real connection needed)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.clients.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("requires authentication to list clients", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.clients.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Payments ────────────────────────────────────────────────────────────────

describe("payments", () => {
  it("returns list (mocked DB, no real connection needed)", async () => {
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.payments.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("requires authentication to list payments", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(caller.payments.list({})).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ─── Audit ───────────────────────────────────────────────────────────────────

describe("audit", () => {
  it("returns audit logs for admin (mocked DB)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.audit.list({ limit: 10 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("throws FORBIDDEN for non-admin on audit list", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.audit.list({ limit: 10 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ─── Dashboard ───────────────────────────────────────────────────────────────

describe("dashboard", () => {
  it("returns stats object with required fields (mocked DB)", async () => {
    const caller = appRouter.createCaller(makeCtx("admin"));
    const result = await caller.dashboard.stats();
    expect(result).toHaveProperty("totalLoans");
    expect(result).toHaveProperty("activeLoans");
    expect(result).toHaveProperty("totalClients");
    expect(result).toHaveProperty("totalCollected");
  });

  it("throws FORBIDDEN for non-admin on dashboard stats", async () => {
    const caller = appRouter.createCaller(makeCtx("user"));
    await expect(caller.dashboard.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
