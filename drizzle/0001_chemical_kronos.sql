ALTER TABLE "integrations" ALTER COLUMN "service" SET DATA TYPE varchar(255);--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_service_unique" UNIQUE("service");