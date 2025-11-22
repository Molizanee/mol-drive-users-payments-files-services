import { boolean, date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  name: varchar({ length: 255 }).notNull(),
  email: varchar({ length: 255 }).notNull().unique(),
  created_at: date().notNull().defaultNow(),
  updated_at: date().notNull().defaultNow(),
  deleted_at: date(),
  is_deleted: boolean().default(false),
});
