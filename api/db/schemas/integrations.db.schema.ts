import { date, pgTable, uuid, varchar } from "drizzle-orm/pg-core";

export const integrationsTable = pgTable("integrations", {
  id: uuid().primaryKey().defaultRandom(),
  service: varchar({ length: 255 }).notNull().unique(),
  created_at: date().notNull().defaultNow(),    
});