CREATE TABLE "notify"."notification_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" text DEFAULT 'expo' NOT NULL,
	"platform" text NOT NULL,
	"push_token" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"app_version" text,
	"device_label" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_registered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notify"."notification_recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"delivery_channel" text DEFAULT 'inbox' NOT NULL,
	"deep_link" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'unread' NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notify"."notification_devices" ADD CONSTRAINT "notification_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notify"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "notify"."notifications"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "notify"."notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_devices_provider_token_idx" ON "notify"."notification_devices" USING btree ("provider","push_token");
--> statement-breakpoint
CREATE INDEX "notification_devices_user_status_idx" ON "notify"."notification_devices" USING btree ("user_id","status","last_seen_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "notification_recipients_notification_user_idx" ON "notify"."notification_recipients" USING btree ("notification_id","user_id");
--> statement-breakpoint
CREATE INDEX "notification_recipients_user_status_created_idx" ON "notify"."notification_recipients" USING btree ("user_id","status","created_at");
