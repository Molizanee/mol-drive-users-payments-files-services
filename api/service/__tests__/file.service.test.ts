import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";
import { filesTables } from "../../db/schemas/files.db.schema";

const originalEnv = { ...process.env };
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
}

const restoreEnv = () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in originalEnv)) {
      delete process.env[key];
    }
  }

  Object.assign(process.env, originalEnv);
};

const valuesMock = mock(async () => undefined);
const insertMock = mock(() => ({ values: valuesMock }));
const { FileService } = await import("../file.service");

type InsertCapableDb = NonNullable<Parameters<typeof FileService.createFileRecord>[2]>;
const createMockDb = (): InsertCapableDb => ({
  insert: insertMock as unknown as InsertCapableDb["insert"],
});

beforeEach(() => {
  insertMock.mockReset();
  insertMock.mockImplementation(() => ({ values: valuesMock }));
  valuesMock.mockReset();
  valuesMock.mockResolvedValue(undefined);
});

afterAll(() => {
  restoreEnv();
});

describe("FileService.createFileRecord", () => {
  test("inserts a row with the provided IDs", async () => {
    const mockDb = createMockDb();
    await FileService.createFileRecord("object-123", "connection-456", mockDb);

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock).toHaveBeenCalledWith(filesTables);
    expect(valuesMock).toHaveBeenCalledWith({
      object_file_id: "object-123",
      connection_id: "connection-456",
    });
  });

  test("propagates database errors", async () => {
    valuesMock.mockRejectedValueOnce(new Error("insert failed"));
    const mockDb = createMockDb();

    await expect(FileService.createFileRecord("object-123", "connection-456", mockDb)).rejects.toThrow("insert failed");

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(valuesMock).toHaveBeenCalledTimes(1);
  });
});
