import type { TelegramMessage, WebhookUpdate } from "../schemas";
import { TelegramService, logger, runtimeLogContext } from "../service";

export class TelegramController {
	static async handleWebhook(update: WebhookUpdate): Promise<void> {
		if (!update.message) {
			logger.warn({ updateId: update.update_id }, "Webhook update received without message payload");
			return;
		}

		const message = update.message;
		const chatId = message.chat.id;

		if (runtimeLogContext.isDevelopment) {
			logger.debug(
				{ chatId, messageId: message.message_id, message },
				"Telegram message payload received",
			);
		} else {
			logger.info({ chatId, messageId: message.message_id }, "Telegram message received");
		}

		if (message.document) {
			logger.info({ chatId, messageId: message.message_id }, "Processing document message");
			await this.handleDocument(chatId, message);
			return;
		}

		logger.warn({ chatId, messageId: message.message_id }, "Unsupported Telegram message type received");
		await TelegramService.sendMessage(chatId, "Only PDF documents are supported. Please resend as a PDF file.");
	}

	private static async handleDocument(chatId: number, message: TelegramMessage) {
		const document = message.document;
		if (!document) return;

		if (!this.isPdfDocument(document)) {
			logger.warn(
				{ chatId, messageId: message.message_id, mimeType: document.mime_type, fileName: document.file_name },
				"Rejected non-PDF document",
			);
			await TelegramService.sendMessage(chatId, "Only PDF documents can be saved right now. Please send a PDF file.");
			return;
		}

		await this.downloadWithFeedback({
			messageId: message.message_id,
			chatId,
			fileId: document.file_id,
			subDir: "documents",
			fileName: document.file_name,
			startText: "Processing document...",
			successText: "Document saved! ✅",
		});
	}

	private static isPdfDocument(document: TelegramMessage["document"]): boolean {
		if (!document) return false;
		const mimeType = document.mime_type?.toLowerCase() ?? "";
		if (mimeType === "application/pdf") return true;
		const fileName = document.file_name?.toLowerCase() ?? "";
		return fileName.endsWith(".pdf");
	}

	private static async downloadWithFeedback(args: {
		chatId: number;
		fileId: string;
		subDir: string;
		startText: string;
		successText: string;
		fileName?: string;
		messageId: number;
	}) {
		const { chatId, fileId, subDir, startText, successText, fileName, messageId } = args;
		await TelegramService.sendMessage(chatId, startText);

		const downloadResult = await TelegramService.downloadFile(fileId, subDir, {
			preferredFileName: fileName,
			objectNameOverride: fileName,
		});
		if (!downloadResult.success) {
			logger.error(
				{ chatId, fileId, subDir, err: downloadResult.error },
				"Telegram download failed",
			);
			await TelegramService.sendMessage(chatId, "Failed to save file ❌");
			return;
		}

		logger.info(
			{ chatId, fileId, subDir, objectKey: downloadResult.path, url: downloadResult.url },
			"Telegram file stored in MinIO",
		);

		await TelegramService.sendMessage(
			chatId,
			`${successText}\nObject path: ${downloadResult.path}`,
		);
	}
}
