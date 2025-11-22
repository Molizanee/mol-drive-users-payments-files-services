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

		if (message.photo && message.photo.length > 0) {
			logger.info({ chatId, messageId: message.message_id }, "Processing photo message");
			await this.handlePhoto(chatId, message);
			return;
		}

		if (message.voice) {
			logger.info({ chatId, messageId: message.message_id }, "Processing voice message");
			await this.handleVoice(chatId, message);
			return;
		}

		if (message.audio) {
			logger.info({ chatId, messageId: message.message_id }, "Processing audio message");
			await this.handleAudio(chatId, message);
			return;
		}

		if (message.video) {
			logger.info({ chatId, messageId: message.message_id }, "Processing video message");
			await this.handleVideo(chatId, message);
			return;
		}

		logger.warn({ chatId, messageId: message.message_id }, "Unsupported Telegram message type received");
	}

	private static async handleDocument(chatId: number, message: TelegramMessage) {
		const document = message.document;
		if (!document) return;

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

	private static async handlePhoto(chatId: number, message: TelegramMessage) {
		const photoSizes = message.photo;
		if (!photoSizes || photoSizes.length === 0) return;
		const largestPhoto = photoSizes.at(-1);
		if (!largestPhoto) return;
		await this.downloadWithFeedback({
			messageId: message.message_id,
			chatId,
			fileId: largestPhoto.file_id,
			subDir: "photos",
			startText: "Processing photo...",
			successText: "Photo saved! 📸",
		});
	}

	private static async handleVoice(chatId: number, message: TelegramMessage) {
		const voice = message.voice;
		if (!voice) return;
		await this.downloadWithFeedback({
			messageId: message.message_id,
			chatId,
			fileId: voice.file_id,
			subDir: "voice",
			startText: "Processing voice note...",
			successText: "Voice note saved! 🎤",
		});
	}

	private static async handleAudio(chatId: number, message: TelegramMessage) {
		const audio = message.audio;
		if (!audio) return;
		await this.downloadWithFeedback({
			messageId: message.message_id,
			chatId,
			fileId: audio.file_id,
			subDir: "audio",
			startText: "Processing audio...",
			successText: "Audio saved! 🎧",
		});
	}

	private static async handleVideo(chatId: number, message: TelegramMessage) {
		const video = message.video;
		if (!video) return;
		await this.downloadWithFeedback({
			messageId: message.message_id,
			chatId,
			fileId: video.file_id,
			subDir: "videos",
			startText: "Processing video...",
			successText: "Video saved! 🎬",
		});
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
