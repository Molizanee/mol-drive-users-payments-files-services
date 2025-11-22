import { afterAll, afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import { Buffer } from "buffer";

const originalEnv = { ...process.env };
Object.assign(process.env, {
  PORT: process.env.PORT ?? "3000",
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ?? "test-token",
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET ?? "secret",
  STORAGE_PATH: "./downloads",
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  LOG_PRETTY: "false",
  MINIO_ENDPOINT: "http://127.0.0.1:9000",
  MINIO_ADMIN_USER: "minio",
  MINIO_ADMIN_PASSWORD: "password",
  MINIO_BUCKET_NAME: "uploads",
});

const objectStorageModule = await import("../object-storage.service");
const { uploadObject, buildObjectKey, getObjectUrl, resetObjectStorageTestState } = objectStorageModule;
const configModule = await import("../../config");
const { config, minioClient } = configModule;

const bucketExistsSpy = spyOn(minioClient, "bucketExists");
const makeBucketSpy = spyOn(minioClient, "makeBucket");
const putObjectSpy = spyOn(minioClient, "putObject");

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
};

beforeEach(() => {
  resetObjectStorageTestState();
  bucketExistsSpy.mockReset();
  makeBucketSpy.mockReset();
  putObjectSpy.mockReset();
  bucketExistsSpy.mockResolvedValue(true);
  makeBucketSpy.mockResolvedValue(undefined as never);
  putObjectSpy.mockResolvedValue(undefined as never);
});

afterEach(() => {
  resetObjectStorageTestState();
});

afterAll(() => {
  bucketExistsSpy.mockRestore();
  makeBucketSpy.mockRestore();
  putObjectSpy.mockRestore();
  restoreEnv();
});

describe("buildObjectKey", () => {
  test("trims excess slashes and joins segments", () => {
    expect(buildObjectKey("/files/", "note.txt")).toBe("files/note.txt");
    expect(buildObjectKey("nested/path/", "note.txt")).toBe("nested/path/note.txt");
    expect(buildObjectKey("", "note.txt")).toBe("note.txt");
  });
});

describe("getObjectUrl", () => {
  test("uses the configured protocol and host", () => {
    const originalHost = config.MINIO_HOST;
    const originalPort = config.MINIO_PORT;
    const originalBucket = config.MINIO_BUCKET_NAME;
    const originalSsl = config.MINIO_USE_SSL;

    config.MINIO_HOST = "localhost";
    config.MINIO_PORT = 9000;
    config.MINIO_BUCKET_NAME = "uploads";
    config.MINIO_USE_SSL = false;

    expect(getObjectUrl("files/doc.txt")).toBe("http://localhost:9000/uploads/files/doc.txt");

    config.MINIO_USE_SSL = true;
    config.MINIO_HOST = "cdn.example.com";
    config.MINIO_PORT = 8443;

    expect(getObjectUrl("files/doc.txt")).toBe("https://cdn.example.com:8443/uploads/files/doc.txt");

    config.MINIO_HOST = originalHost;
    config.MINIO_PORT = originalPort;
    config.MINIO_BUCKET_NAME = originalBucket;
    config.MINIO_USE_SSL = originalSsl;
  });
});

describe("uploadObject", () => {
  test("converts various payload types and forwards metadata", async () => {
    const payload = Uint8Array.from([1, 2, 3, 4]);

    await uploadObject({
      data: payload,
      objectKey: "files/data.bin",
      contentType: "application/octet-stream",
      metadata: { "x-amz-meta-origin": "telegram" },
    });

    expect(bucketExistsSpy).toHaveBeenCalledTimes(1);
    expect(makeBucketSpy).not.toHaveBeenCalled();
    expect(putObjectSpy).toHaveBeenCalledTimes(1);

    const [bucket, key, buffer, size, metadata] = putObjectSpy.mock.calls[0] ?? [];
    expect(bucket).toBe(config.MINIO_BUCKET_NAME);
    expect(key).toBe("files/data.bin");
    expect(Buffer.isBuffer(buffer)).toBe(true);
    expect(size).toBe((buffer as Buffer).byteLength);
    expect(metadata).toEqual({
      "x-amz-meta-origin": "telegram",
      "Content-Type": "application/octet-stream",
    });
  });

  test("creates the bucket when it does not exist", async () => {
    bucketExistsSpy.mockResolvedValueOnce(false);

    await uploadObject({
      data: new ArrayBuffer(8),
      objectKey: "files/new.bin",
    });

    expect(makeBucketSpy).toHaveBeenCalledWith(config.MINIO_BUCKET_NAME);
  });

  test("reuses the cached bucket initialization between uploads", async () => {
    await uploadObject({ data: new ArrayBuffer(1), objectKey: "files/first.bin" });
    await uploadObject({ data: new ArrayBuffer(1), objectKey: "files/second.bin" });

    expect(bucketExistsSpy).toHaveBeenCalledTimes(1);
  });
});
