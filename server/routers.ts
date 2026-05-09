import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { workouts, calendarEntries } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { ratingRouter } from "./rating";
import { sessionWarmupRouter } from "./sessionWarmups";

export const appRouter = router({
  system: systemRouter,
  rating: ratingRouter,
  sessionWarmups: sessionWarmupRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  workout: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) return [];
      const results = await db.select().from(workouts).where(eq(workouts.userId, ctx.user.id));
      return results;
    }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(255),
        exercises: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(workouts).values({
          userId: ctx.user.id,
          name: input.name,
          exercises: input.exercises,
        });
        return { id: result[0].insertId, name: input.name };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        exercises: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const updateData: any = {};
        if (input.name) updateData.name = input.name;
        if (input.exercises) updateData.exercises = input.exercises;
        await db.update(workouts)
          .set(updateData)
          .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.user.id)));
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Delete associated calendar entries
        await db.delete(calendarEntries)
          .where(and(eq(calendarEntries.workoutId, input.id), eq(calendarEntries.userId, ctx.user.id)));
        await db.delete(workouts)
          .where(and(eq(workouts.id, input.id), eq(workouts.userId, ctx.user.id)));
        return { success: true };
      }),
  }),

  calendar: router({
    getEntries: protectedProcedure
      .input(z.object({
        month: z.string(), // YYYY-MM format
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return [];
        const results = await db.select().from(calendarEntries)
          .where(eq(calendarEntries.userId, ctx.user.id));
        // Filter by month prefix
        return results.filter(e => e.date.startsWith(input.month));
      }),

    addEntry: protectedProcedure
      .input(z.object({
        workoutId: z.number(),
        date: z.string(), // YYYY-MM-DD
        customExercises: z.any().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        const result = await db.insert(calendarEntries).values({
          userId: ctx.user.id,
          workoutId: input.workoutId,
          date: input.date,
          customExercises: input.customExercises || null,
        });
        return { id: result[0].insertId };
      }),

    removeEntry: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(calendarEntries)
          .where(and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, ctx.user.id)));
        return { success: true };
      }),

    toggleComplete: protectedProcedure
      .input(z.object({ id: z.number(), completed: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(calendarEntries)
          .set({ completed: input.completed })
          .where(and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, ctx.user.id)));
        return { success: true };
      }),

    updateCustomExercises: protectedProcedure
      .input(z.object({
        id: z.number(),
        customExercises: z.any(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.update(calendarEntries)
          .set({ customExercises: input.customExercises })
          .where(and(eq(calendarEntries.id, input.id), eq(calendarEntries.userId, ctx.user.id)));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
