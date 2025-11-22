import { boolean, date, pgTable, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users.db.schema";
import { integrationsTable } from "./integrations.db.schema";

export const connectionsTable = pgTable("connections", {
  id: uuid().primaryKey().defaultRandom(),
  user_id: uuid().notNull().references(() => usersTable.id),
  integration_id: uuid().notNull().references(() => integrationsTable.id),
  is_authenticated: boolean().default(false),
  created_at: date().notNull().defaultNow(),
  updated_at: date().notNull().defaultNow(),
  deleted_at: date(),
  is_deleted: boolean().default(false),
});