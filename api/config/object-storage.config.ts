import { z } from "zod";

const objectStorageEnvSchema = z.object({
  MINIO_ENDPOINT: z.string().url(),
  MINIO_ADMIN_USER: z.string().min(1),
  MINIO_ADMIN_PASSWORD: z.string().min(1),
  MINIO_BUCKET_NAME: z.string().min(1),
});

const env = objectStorageEnvSchema.parse(process.env);
const endpointUrl = new URL(env.MINIO_ENDPOINT);
const connectionPort = endpointUrl.port ? Number(endpointUrl.port) : endpointUrl.protocol === "https:" ? 443 : 80;

const useSSL = endpointUrl.protocol === "https:";

function normalizeProtocol(protocol: string) {
  return protocol.endsWith(":") ? protocol.slice(0, -1) : protocol;
}

export const objectStorageConfig = {
  ...env,
  connection: {
    host: endpointUrl.hostname,
    port: connectionPort,
    useSSL,
    protocol: normalizeProtocol(endpointUrl.protocol),
  },
};

export type ObjectStorageConfig = typeof objectStorageConfig;
