import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const originalEnv = { ...process.env };
Object.assign(process.env, {
  PORT: process.env.PORT ?? "3000",
  TELEGRAM_BOT_TOKEN: "test-token",
  TELEGRAM_WEBHOOK_SECRET: "secret",
  STORAGE_PATH: "./downloads",
  NODE_ENV: "test",
  LOG_LEVEL: "silent",
  LOG_PRETTY: "false",
  MINIO_ENDPOINT: "http://127.0.0.1:9000",
  MINIO_ADMIN_USER: "minio",
  MINIO_ADMIN_PASSWORD: "password",
  MINIO_BUCKET_NAME: "uploads",
});

const loggerModulePath = new URL("../logger.ts", import.meta.url).pathname;
const objectStorageModulePath = new URL("../object-storage.service.ts", import.meta.url).pathname;
const fileServiceModulePath = new URL("../file.service.ts", import.meta.url).pathname;

const actualLoggerModule = await import(loggerModulePath);
const actualObjectStorageModule = await import(objectStorageModulePath);
const actualFileServiceModule = await import(fileServiceModulePath);

const logger = {
  debug: mock(() => {}),
  info: mock(() => {}),
  error: mock(() => {}),
};

const buildObjectKeyMock = mock((subDir: string, fileName: string) => `${subDir}/${fileName}`);
const uploadObjectMock = mock(async () => ({ bucket: "uploads", objectKey: "uploads/test.bin" }));
const createFileRecordMock = mock(async () => {});

mock.module(loggerModulePath, () => ({
  ...actualLoggerModule,
  logger,
}));

mock.module(objectStorageModulePath, () => ({
  ...actualObjectStorageModule,
  buildObjectKey: buildObjectKeyMock,
  uploadObject: uploadObjectMock,
}));

mock.module(fileServiceModulePath, () => ({
  ...actualFileServiceModule,
  FileService: class {
    static createFileRecord = createFileRecordMock;
  },
}));

const { TelegramService } = await import("../telegram.service");

const originalFetch = globalThis.fetch;
const fetchMock = mock<typeof fetch>();
const originalCrypto = globalThis.crypto;
const randomUUIDMock = mock(() => "test-uuid");

const createJsonResponse = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    ...init,
  });

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
};

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  buildObjectKeyMock.mockReset();
  buildObjectKeyMock.mockImplementation((subDir: string, fileName: string) => `${subDir}/${fileName}`);
  uploadObjectMock.mockReset();
  createFileRecordMock.mockReset();
  logger.debug.mockReset();
  logger.info.mockReset();
  logger.error.mockReset();
  randomUUIDMock.mockReset();
  randomUUIDMock.mockReturnValue("test-uuid");
  if (!globalThis.crypto) {
    globalThis.crypto = { randomUUID: randomUUIDMock as unknown as typeof crypto.randomUUID } as Crypto;
  } else {
    globalThis.crypto.randomUUID = randomUUIDMock as unknown as typeof crypto.randomUUID;
  }
});

afterAll(() => {
  globalThis.fetch = originalFetch;
  mock.module(loggerModulePath, () => actualLoggerModule);
  mock.module(objectStorageModulePath, () => actualObjectStorageModule);
  mock.module(fileServiceModulePath, () => actualFileServiceModule);
  if (originalCrypto) {
    globalThis.crypto = originalCrypto;
  }
  restoreEnv();
});

const createFileInfoResponse = (fileId: string, filePath: string) => ({
  ok: true,
  result: {
    file_id: fileId,
    file_unique_id: `${fileId}-unique`,
    file_path: filePath,
  },
});

describe("TelegramService.downloadFile", () => {
  test("uploads remote file and returns storage metadata", async () => {
    const fileInfo = createFileInfoResponse("abc", "docs/photo.png");
    const fileBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);

    fetchMock
      .mockResolvedValueOnce(createJsonResponse(fileInfo))
      .mockResolvedValueOnce(new Response(fileBytes, { headers: { "content-type": "image/png" } }));

    const result = await TelegramService.downloadFile("abc", "uploads", { preferredFileName: "../nice.png" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toContain("getFile?file_id=abc");
    expect(buildObjectKeyMock).toHaveBeenCalledWith("uploads", "test-uuid_id_nice.png");
    expect(uploadObjectMock).toHaveBeenCalledWith({
      data: expect.any(ArrayBuffer),
      objectKey: "uploads/test-uuid_id_nice.png",
      contentType: "image/png",
    });
    expect(createFileRecordMock).toHaveBeenCalledWith("test-uuid", "7f5df82c-1faa-4ba1-9430-4e9fd82c02fa");
    expect(result).toEqual({
      success: true,
      path: "uploads/test-uuid_id_nice.png",
      fileName: "nice.png",
    });
  });

  test("allows overriding the final object key without changing user-facing filename", async () => {
    const fileInfo = createFileInfoResponse("file-2", "docs/report.pdf");
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(fileInfo))
      .mockResolvedValueOnce(new Response(Uint8Array.from([1, 2, 3]), { headers: { "content-type": "application/pdf" } }));

    const result = await TelegramService.downloadFile("file-2", "files", {
      objectNameOverride: "  /override/custom.bin  ",
    });

    expect(buildObjectKeyMock).toHaveBeenCalledWith("files", "test-uuid_id_custom.bin");
    expect(uploadObjectMock).toHaveBeenCalledWith({
      data: expect.any(ArrayBuffer),
      objectKey: "files/test-uuid_id_custom.bin",
      contentType: "application/pdf",
    });
    expect(createFileRecordMock).toHaveBeenCalledWith("test-uuid", "7f5df82c-1faa-4ba1-9430-4e9fd82c02fa");
    expect(result).toMatchObject({ success: true, fileName: "report.pdf", path: "files/test-uuid_id_custom.bin" });
  });

  test("propagates Telegram API errors", async () => {
    fetchMock.mockResolvedValueOnce(createJsonResponse({ ok: false, description: "bad file" }));

    const result = await TelegramService.downloadFile("bad", "files");

    expect(result.success).toBe(false);
    expect(uploadObjectMock).not.toHaveBeenCalled();
    expect(createFileRecordMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalled();
  });

  test("fails when the binary download response is not ok", async () => {
    const fileInfo = createFileInfoResponse("file-3", "docs/photo.jpg");
    fetchMock
      .mockResolvedValueOnce(createJsonResponse(fileInfo))
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    const result = await TelegramService.downloadFile("file-3", "files");

    expect(result.success).toBe(false);
    expect(uploadObjectMock).not.toHaveBeenCalled();
    expect(createFileRecordMock).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe("TelegramService.sendMessage", () => {
  test("sends JSON payload to Telegram API", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 200 }));

    await TelegramService.sendMessage(42, "hello there");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toContain("/sendMessage");
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(init?.body).toBeTruthy();
    expect(JSON.parse(String(init?.body))).toEqual({ chat_id: 42, text: "hello there" });
  });
});
