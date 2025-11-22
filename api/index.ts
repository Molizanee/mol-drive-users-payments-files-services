import { config } from "../api/config/index";
import { WebhookUpdateSchema } from "../api/schemas/index";
import { TelegramController } from "./controllers";
import { logger } from "./service";
import { z } from "zod";

const server = Bun.serve({
  port: config.PORT,
  async fetch(req) {
    const url = new URL(req.url);
    const requestContext = { method: req.method, path: url.pathname };
    
    if (req.method === "GET" && url.pathname === "/health") {
      logger.trace({ ...requestContext }, "Health check hit");
      return new Response("OK");
    }

    if (req.method === "POST" && url.pathname === "/webhook") {
      logger.info({ ...requestContext }, "Incoming Telegram webhook");
      try {
        const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
        if (secretToken !== config.TELEGRAM_WEBHOOK_SECRET) {
          logger.warn({ ...requestContext }, "Rejected webhook: invalid secret token");
          return new Response("Unauthorized", { status: 401 });
        }

        const body = await req.json();

        const update = WebhookUpdateSchema.parse(body);

        // Process asynchronously so Telegram gets its ACK within 10s and doesn't retry the same update
        void TelegramController.handleWebhook(update).catch((err) => {
          logger.error({ ...requestContext, err }, "Webhook handler crashed (async)");
        });

        return new Response("OK", { status: 200 });

      } catch (err) {
        // ERROR HANDLING
        if (err instanceof z.ZodError) {
          logger.warn({ ...requestContext, issues: err.format() }, "Webhook validation failed");
          // Return 200 to Telegram so it doesn't keep retrying invalid updates
          return new Response("Invalid Schema", { status: 200 }); 
        }

        logger.error({ ...requestContext, err }, "Webhook handler crashed");
        return new Response("Internal Error", { status: 500 });
      }
    }

    return new Response("Not Found", { status: 404 });
  },
});

logger.info({ port: server.port, bucket: config.MINIO_BUCKET_NAME }, "API server started");