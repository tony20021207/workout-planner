import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the database module
vi.mock("./db", () => ({
  getDb: vi.fn(),
}));

// Mock drizzle schema
vi.mock("../drizzle/schema", () => ({
  workouts: { userId: "userId", id: "id" },
  calendarEntries: { userId: "userId", workoutId: "workoutId", id: "id" },
}));

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("workout router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("workout.list requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.workout.list()).rejects.toThrow();
  });

  it("workout.list returns empty array when db returns empty", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.workout.list();
    expect(result).toEqual([]);
  });

  it("workout.create requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workout.create({ name: "Test", exercises: [] })
    ).rejects.toThrow();
  });

  it("workout.create validates name is non-empty", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.workout.create({ name: "", exercises: [] })
    ).rejects.toThrow();
  });

  it("workout.delete requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.workout.delete({ id: 1 })).rejects.toThrow();
  });
});

describe("calendar router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calendar.getEntries requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.calendar.getEntries({ month: "2026-05" })
    ).rejects.toThrow();
  });

  it("calendar.addEntry requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.calendar.addEntry({ workoutId: 1, date: "2026-05-01" })
    ).rejects.toThrow();
  });

  it("calendar.removeEntry requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.calendar.removeEntry({ id: 1 })
    ).rejects.toThrow();
  });

  it("calendar.toggleComplete requires authentication", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.calendar.toggleComplete({ id: 1, completed: 1 })
    ).rejects.toThrow();
  });

  it("calendar.getEntries returns empty when db returns empty", async () => {
    const { getDb } = await import("./db");
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    (getDb as any).mockResolvedValue(mockDb);

    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.calendar.getEntries({ month: "2026-05" });
    expect(result).toEqual([]);
  });
});
