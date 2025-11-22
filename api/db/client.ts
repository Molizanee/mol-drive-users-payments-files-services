import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";

import { databaseConfig } from "../config/database.config";
import * as schema from "./schema";

type GlobalWithDb = typeof globalThis & {
  __dbClient?: ReturnType<typeof postgres>;
  __drizzleDb?: ReturnType<typeof drizzle>;
};

const globalRef = globalThis as GlobalWithDb;

const queryClient =
  globalRef.__dbClient ??
  (globalRef.__dbClient = postgres(databaseConfig.url, {
    max: databaseConfig.maxConnections,
    idle_timeout: 20,
    prepare: false,
  }));

export const db = globalRef.__drizzleDb ?? (globalRef.__drizzleDb = drizzle(queryClient, { schema }));
export type DbClient = typeof db;
