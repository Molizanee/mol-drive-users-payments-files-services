import { z } from "zod";

const TelegramBaseFileSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string(),
  file_size: z.number().optional(),
});

export const TelegramDocumentSchema = TelegramBaseFileSchema.extend({
  file_name: z.string().optional(),
  mime_type: z.string().optional(),
});

export const TelegramPhotoSizeSchema = TelegramBaseFileSchema.extend({
  width: z.number(),
  height: z.number(),
});

export const TelegramAudioSchema = TelegramBaseFileSchema.extend({
  duration: z.number(),
  mime_type: z.string().optional(),
});

export const TelegramMessageSchema = z.object({
  message_id: z.number(),
  chat: z.object({
    id: z.number(),
    type: z.string(),
    username: z.string().optional(),
  }),
  date: z.number(),
  text: z.string().optional(),
  document: TelegramDocumentSchema.optional(),
  photo: z.array(TelegramPhotoSizeSchema).optional(),
  voice: TelegramBaseFileSchema.optional(),
  audio: TelegramAudioSchema.optional(),
  video: TelegramBaseFileSchema.optional(),
});

export const WebhookUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
});

export type WebhookUpdate = z.infer<typeof WebhookUpdateSchema>;
export type TelegramMessage = z.infer<typeof TelegramMessageSchema>;