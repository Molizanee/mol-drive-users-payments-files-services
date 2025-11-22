import { basename } from "path";
import { config } from "../config";
import { logger } from "./logger";
import { buildObjectKey, getObjectUrl, uploadObject } from "./object-storage.service";

const API_BASE = `https://api.telegram.org/bot${config.TELEGRAM_BOT_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${config.TELEGRAM_BOT_TOKEN}`;

type TelegramAPIError = {
  ok: false;
  description?: string;
  error_code?: number;
};

type TelegramAPIResponse<T> =
  | ({ ok: true; result: T; description?: string })
  | TelegramAPIError;

export type TelegramFileInfo = {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path: string;
};

export type TelegramDownloadResult =
  | { success: true; path: string; fileName: string; url: string }
  | { success: false; error: unknown };

type TelegramSendMessagePayload = {
  chat_id: number;
  text: string;
};

type TelegramDownloadFileOptions = {
  preferredFileName?: string;
  objectNameOverride?: string;
};

export class TelegramService {
  /**
   * 1. Get file info from Telegram API
   * 2. Download the stream
   * 3. Save to disk
   */
  static async downloadFile(
    fileId: string,
    subDir: string = "files",
    options: TelegramDownloadFileOptions = {},
  ): Promise<TelegramDownloadResult> {
    try {
      // Step 1: Get file path
      const fileInfoRes = await fetch(`${API_BASE}/getFile?file_id=${fileId}`);
      // console.log(fileInfoRes);
      const fileInfoJson = (await fileInfoRes.json()) as TelegramAPIResponse<TelegramFileInfo>;

      if (!fileInfoJson.ok) {
        throw new Error(`Telegram Error: ${fileInfoJson.description ?? "Unknown error"}`);
      }

      const remoteFilePath = fileInfoJson.result.file_path;
      const resolvedRemoteName = remoteFilePath ? basename(remoteFilePath) : undefined;
      const preferredFileName = options.preferredFileName ? basename(options.preferredFileName) : undefined;
      const fallbackExtension = remoteFilePath?.split(".").pop() || "bin";
      const fileName = preferredFileName || resolvedRemoteName || `${fileId}.${fallbackExtension}`;
      logger.debug({ fileId, fileName, preferredFileName, resolvedRemoteName }, "Resolved Telegram file name");
      
      // Step 2: Download file data and upload to object storage
      const overrideBaseName = options.objectNameOverride ? basename(options.objectNameOverride).trim() : undefined;
      const objectBaseName = overrideBaseName && overrideBaseName.length > 0 ? overrideBaseName : fileName;
      const objectKey = buildObjectKey(subDir, objectBaseName);
      logger.debug({ fileId, objectKey }, "Resolved Telegram object key");

      logger.debug({ fileId, remoteFilePath }, "Starting Telegram download");
      const fileRes = await fetch(`${FILE_BASE}/${remoteFilePath}`);

      if (!fileRes.ok || !fileRes.body) throw new Error("Failed to download file stream");

      const fileBuffer = await fileRes.arrayBuffer();
      const contentType = fileRes.headers.get("content-type");

      await uploadObject({
        data: fileBuffer,
        objectKey,
        contentType,
      });

      const objectUrl = getObjectUrl(objectKey);

      logger.info({ fileId, objectKey, fileName }, "Telegram file uploaded to MinIO successfully");
      return { success: true, path: objectKey, fileName, url: objectUrl };

    } catch (error) {
      logger.error({ fileId, subDir, err: error }, "Telegram download failed");
      return { success: false, error };
    }
  }

  static async sendMessage(chatId: number, text: string) {
    const payload: TelegramSendMessagePayload = { chat_id: chatId, text };
    logger.debug({ chatId }, "Sending Telegram message");
    await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }
}