ALTER TABLE "connections" ADD COLUMN "user_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "is_authenticated" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "created_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "updated_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "deleted_at" date;--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "created_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "updated_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "deleted_at" date;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "created_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "created_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" date DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deleted_at" date;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_deleted" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" DROP COLUMN "code";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "connections_id";