import { defineConfig } from "drizzle-kit";

import { databaseConfig } from "./api/config/databases/postgres.config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./api/db/**/*.db.schema.ts",
  out: "./drizzle",
  strict: true,
  verbose: true,
  dbCredentials: {
    url: databaseConfig.url,
  },
});
