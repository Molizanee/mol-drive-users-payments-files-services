import { z } from "zod";

const dbEnvSchema = z
  .object({
    DATABASE_URL: z.url().optional(),
    POSTGRESQL_DATABASE_URL: z.url().optional(),
    POSTGRESQL_ENDPOINT: z.url().optional(),
    POSTGRESQL_HOST: z.string().optional(),
    POSTGRESQL_PORT: z.coerce.number().optional(),
    POSTGRESQL_USER: z.string().min(1, "POSTGRESQL_USER is required").optional(),
    POSTGRESQL_PASSWORD: z.string().min(1, "POSTGRESQL_PASSWORD is required").optional(),
    POSTGRESQL_DATABASE: z.string().min(1, "POSTGRESQL_DATABASE is required").optional(),
    POSTGRES_MAX_CONNECTIONS: z.coerce.number().min(1).max(50).default(5),
    POSTGRES_DISABLE_SSL: z.coerce.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    if (value.DATABASE_URL || value.POSTGRESQL_DATABASE_URL) {
      return;
    }

    const hasEndpoint = Boolean(value.POSTGRESQL_ENDPOINT);
    const hasHost = Boolean(value.POSTGRESQL_HOST);
    const hasCredentials = value.POSTGRESQL_USER && value.POSTGRESQL_PASSWORD && value.POSTGRESQL_DATABASE;

    if (!hasCredentials || (!hasEndpoint && !hasHost)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Provide DATABASE_URL/POSTGRESQL_DATABASE_URL or set POSTGRESQL_(HOST|ENDPOINT), POSTGRESQL_USER, POSTGRESQL_PASSWORD, and POSTGRESQL_DATABASE.",
      });
    }
  });

type DbEnv = z.infer<typeof dbEnvSchema>;

type DatabaseConnectionDetails = {
  host: string;
  port: number;
  database: string;
  user: string;
  sslMode: string;
  useSSL: boolean;
};

const env = dbEnvSchema.parse(process.env);

function deriveHostAndPort(dbEnv: DbEnv): { host: string; port: number } {
  if (dbEnv.POSTGRESQL_ENDPOINT) {
    const endpointUrl = new URL(dbEnv.POSTGRESQL_ENDPOINT);
    return {
      host: endpointUrl.hostname,
      port: endpointUrl.port ? Number(endpointUrl.port) : endpointUrl.protocol === "https:" ? 443 : 5432,
    };
  }

  if (dbEnv.POSTGRESQL_HOST) {
    const [hostPart, portPart] = dbEnv.POSTGRESQL_HOST.split(":");
    const host = hostPart ?? dbEnv.POSTGRESQL_HOST;
    const fallbackPort = portPart ? Number(portPart) : undefined;
    return {
      host,
      port: dbEnv.POSTGRESQL_PORT ?? fallbackPort ?? 5432,
    };
  }

  throw new Error("POSTGRESQL_HOST or POSTGRESQL_ENDPOINT is required when DATABASE_URL is not set.");
}

function buildConnectionUrl(dbEnv: DbEnv): string {
  const directUrl = dbEnv.DATABASE_URL ?? dbEnv.POSTGRESQL_DATABASE_URL;
  if (directUrl) {
    return directUrl;
  }

  if (!dbEnv.POSTGRESQL_USER || !dbEnv.POSTGRESQL_PASSWORD || !dbEnv.POSTGRESQL_DATABASE) {
    throw new Error("Missing Postgres credentials. Ensure POSTGRESQL_USER, POSTGRESQL_PASSWORD, and POSTGRESQL_DATABASE are set.");
  }

  const { host, port } = deriveHostAndPort(dbEnv);
  const connectionUrl = new URL(`postgresql://${encodeURIComponent(dbEnv.POSTGRESQL_USER)}:${encodeURIComponent(dbEnv.POSTGRESQL_PASSWORD)}@${host}:${port}/${dbEnv.POSTGRESQL_DATABASE}`);

  connectionUrl.searchParams.set("sslmode", dbEnv.POSTGRES_DISABLE_SSL ? "disable" : "require");
  return connectionUrl.toString();
}

function buildConnectionDetails(connectionUrl: string, dbEnv: DbEnv): DatabaseConnectionDetails {
  const parsedUrl = new URL(connectionUrl);
  const sslModeFromUrl = parsedUrl.searchParams.get("sslmode");
  const sslMode = sslModeFromUrl ?? (dbEnv.POSTGRES_DISABLE_SSL ? "disable" : "require");
  const normalizedPath = parsedUrl.pathname.replace(/^\//, "");

  return {
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number(parsedUrl.port) : 5432,
    database: normalizedPath,
    user: decodeURIComponent(parsedUrl.username),
    sslMode,
    useSSL: sslMode !== "disable",
  };
}

const connectionUrl = buildConnectionUrl(env);

export const databaseConfig = {
  url: connectionUrl,
  maxConnections: env.POSTGRES_MAX_CONNECTIONS,
  sslDisabled: env.POSTGRES_DISABLE_SSL,
  connection: buildConnectionDetails(connectionUrl, env),
};

export type DatabaseConfig = typeof databaseConfig;
