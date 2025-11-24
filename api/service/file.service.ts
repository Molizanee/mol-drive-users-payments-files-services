import { db, filesTables, type DbClient } from "../db";

type InsertCapableDb = Pick<DbClient, "insert">;

export class FileService {
  static async createFileRecord(
    objectFileId: string,
    connectionId: string,
    database: InsertCapableDb = db,
  ) {
    await database.insert(filesTables).values({
      object_file_id: objectFileId,
      connection_id: connectionId,
    });
  }
}