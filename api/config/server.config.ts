import { resolve } from "path";
import { z } from "zod";

import { databaseConfig } from "./database.config";
import { objectStorageConfig } from "./object-storage.config";

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  TELEGRAM_BOT_TOKEN: z.string().min(1),
  TELEGRAM_WEBHOOK_SECRET: z.string().min(1),
  STORAGE_PATH: z.string().default("./downloads"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  LOG_PRETTY: z.coerce.boolean().default(true),
});

const parsed = envSchema.parse(process.env);


export const config = {
  ...parsed,
  STORAGE_PATH: resolve(process.cwd(), parsed.STORAGE_PATH),
  MINIO_ENDPOINT: objectStorageConfig.MINIO_ENDPOINT,
  MINIO_ADMIN_USER: objectStorageConfig.MINIO_ADMIN_USER,
  MINIO_ADMIN_PASSWORD: objectStorageConfig.MINIO_ADMIN_PASSWORD,
  MINIO_BUCKET_NAME: objectStorageConfig.MINIO_BUCKET_NAME,
  MINIO_HOST: objectStorageConfig.connection.host,
  MINIO_PORT: objectStorageConfig.connection.port,
  MINIO_USE_SSL: objectStorageConfig.connection.useSSL,
  POSTGRESQL_HOST: databaseConfig.connection.host,
  POSTGRESQL_PORT: databaseConfig.connection.port,
  POSTGRESQL_USE_SSL: databaseConfig.connection.useSSL,
  database: databaseConfig,
  objectStorage: objectStorageConfig,
};

export type ServerConfig = typeof config;