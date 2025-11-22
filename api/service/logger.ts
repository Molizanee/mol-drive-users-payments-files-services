import pino from "pino";
import { config } from "../config";

const isDevelopment = config.NODE_ENV === "development";

export const logger = pino({
  level: config.LOG_LEVEL,
  base: {
    service: "telegram-bot-service",
    env: config.NODE_ENV,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: config.LOG_PRETTY
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          ignore: "pid,hostname",
        },
      }
    : undefined,
});

export const runtimeLogContext = {
  isDevelopment,
};
