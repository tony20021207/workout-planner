import { int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Saved workouts — stores a named workout routine with exercises and parameters
 */
export const workouts = mysqlTable("workouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  exercises: json("exercises").notNull(), // JSON array of RoutineItem[]
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workout = typeof workouts.$inferSelect;
export type InsertWorkout = typeof workouts.$inferInsert;

/**
 * Calendar entries — maps workouts to specific dates with optional customization
 */
export const calendarEntries = mysqlTable("calendarEntries", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  workoutId: int("workoutId").notNull(),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  customExercises: json("customExercises"), // Optional override of exercises for this specific day
  completed: int("completed").default(0).notNull(), // 0 = not completed, 1 = completed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CalendarEntry = typeof calendarEntries.$inferSelect;
export type InsertCalendarEntry = typeof calendarEntries.$inferInsert;
