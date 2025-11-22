import { boolean, date, pgTable, uuid } from "drizzle-orm/pg-core";
import { connectionsTable } from "./connections.db.schema";

export const filesTables = pgTable("files", {
  id: uuid().primaryKey().defaultRandom(),
  object_file_id: uuid().notNull(),
  connection_id: uuid().notNull().references(() => connectionsTable.id),
  created_at: date().notNull().defaultNow(),
  updated_at: date().notNull().defaultNow(),
  deleted_at: date(),
  is_deleted: boolean().default(false),
});