import { Buffer } from "buffer";
import { config, minioClient } from "../config";
import { logger } from "./logger";

let bucketInitialization: Promise<void> | null = null;

async function ensureBucketExists() {
  if (!bucketInitialization) {
    bucketInitialization = (async () => {
      try {
        const exists = await minioClient.bucketExists(config.MINIO_BUCKET_NAME);
        if (!exists) {
          await minioClient.makeBucket(config.MINIO_BUCKET_NAME);
          logger.info({ bucket: config.MINIO_BUCKET_NAME }, "Created MinIO bucket");
        }
      } catch (err) {
        bucketInitialization = null;
        throw err;
      }
    })();
  }

  await bucketInitialization;
}

const trimSlashes = (value: string) => value.replace(/^\/+|\/+$/g, "");

export const buildObjectKey = (subDir: string, fileName: string) => {
  const parts = [trimSlashes(subDir), fileName].filter(Boolean);
  return parts.join("/");
};

type UploadParams = {
  data: ArrayBuffer | Uint8Array | Buffer;
  objectKey: string;
  contentType?: string | null;
  metadata?: Record<string, string>;
};

export async function uploadObject({ data, objectKey, contentType, metadata }: UploadParams) {
  await ensureBucketExists();
  const payload = Buffer.isBuffer(data)
    ? data
    : data instanceof Uint8Array
      ? Buffer.from(data)
      : Buffer.from(data);
  const size = payload.byteLength;

  const metaHeaders: Record<string, string> | undefined = contentType || metadata
    ? {
        ...(metadata ?? {}),
        ...(contentType ? { "Content-Type": contentType } : {}),
      }
    : undefined;

  await minioClient.putObject(config.MINIO_BUCKET_NAME, objectKey, payload, size, metaHeaders);
  logger.info({ bucket: config.MINIO_BUCKET_NAME, objectKey, size }, "Uploaded object to MinIO");

  return { bucket: config.MINIO_BUCKET_NAME, objectKey } as const;
}

export function getObjectUrl(objectKey: string) {
  const protocol = config.MINIO_USE_SSL ? "https" : "http";
  return `${protocol}://${config.MINIO_HOST}:${config.MINIO_PORT}/${config.MINIO_BUCKET_NAME}/${objectKey}`;
}

// Resets cached bucket init promise so tests can start from a clean state.
export function resetObjectStorageTestState() {
  bucketInitialization = null;
}
