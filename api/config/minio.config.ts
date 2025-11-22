import { Client } from "minio";
import { objectStorageConfig } from "./object-storage.config";

export const minioClient = new Client({
  endPoint: objectStorageConfig.connection.host,
  port: objectStorageConfig.connection.port,
  useSSL: objectStorageConfig.connection.useSSL,
  accessKey: objectStorageConfig.MINIO_ADMIN_USER,
  secretKey: objectStorageConfig.MINIO_ADMIN_PASSWORD,
});