import { inArray } from "drizzle-orm";

import { db } from "./client";
import { integrationsTable } from "./schemas/integrations.db.schema";

const defaultIntegrations = ["Telegram", "WhatsApp"] as const;

async function seed() {
  console.info("Ensuring default integrations exist...");

  const existing = await db
    .select({ service: integrationsTable.service })
    .from(integrationsTable)
    .where(inArray(integrationsTable.service, defaultIntegrations));

  const existingServices = new Set(existing.map((integration) => integration.service));
  const missingIntegrations = defaultIntegrations.filter((service) => !existingServices.has(service));

  if (!missingIntegrations.length) {
    console.info("Default integrations already present");
    return;
  }

  await db.insert(integrationsTable).values(missingIntegrations.map((service) => ({ service })));
  console.info(`Inserted integrations: ${missingIntegrations.join(", ")}`);
}

seed()
  .then(() => {
    console.info("Seed completed");
  })
  .catch((error) => {
    console.error("Seed failed", error);
    process.exitCode = 1;
  });
