CREATE TABLE "core"."container_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"waste_stream" text NOT NULL,
	"nominal_capacity_liters" integer,
	"default_fill_alert_percent" integer,
	"default_critical_alert_percent" integer,
	"color_code" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "container_types_code_unique" UNIQUE("code")
);
--> statement-breakpoint
INSERT INTO "core"."container_types" (
	"code",
	"label",
	"waste_stream",
	"nominal_capacity_liters",
	"default_fill_alert_percent",
	"default_critical_alert_percent",
	"color_code"
)
VALUES
	('general_mixed', 'General Mixed Waste', 'mixed', 1000, 80, 95, '#4F5D75'),
	('recyclables', 'Recyclables', 'recyclable', 1000, 75, 90, '#2A9D8F'),
	('glass', 'Glass', 'glass', 1000, 70, 90, '#457B9D')
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "core"."containers" ADD COLUMN "container_type_id" uuid;
--> statement-breakpoint
UPDATE "core"."containers"
SET "container_type_id" = (
	SELECT "id"
	FROM "core"."container_types"
	WHERE "code" = 'general_mixed'
)
WHERE "container_type_id" IS NULL;
--> statement-breakpoint
ALTER TABLE "core"."containers"
ADD CONSTRAINT "containers_container_type_id_container_types_id_fk"
FOREIGN KEY ("container_type_id") REFERENCES "core"."container_types"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE TABLE "iot"."sensor_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid,
	"device_uid" text NOT NULL,
	"hardware_model" text,
	"firmware_version" text,
	"install_status" text DEFAULT 'active' NOT NULL,
	"battery_percent" integer,
	"last_seen_at" timestamp with time zone,
	"installed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "sensor_devices_device_uid_unique" UNIQUE("device_uid"),
	CONSTRAINT "sensor_devices_container_id_containers_id_fk"
		FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "sensor_devices_container_last_seen_idx" ON "iot"."sensor_devices" USING btree ("container_id","last_seen_at");
--> statement-breakpoint
CREATE TABLE "iot"."measurements" (
	"id" bigserial NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"measured_at" timestamp with time zone NOT NULL,
	"fill_level_percent" integer NOT NULL,
	"temperature_c" integer,
	"battery_percent" integer,
	"signal_strength" integer,
	"measurement_quality" text DEFAULT 'valid' NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurements_id_measured_at_pk" PRIMARY KEY("id","measured_at"),
	CONSTRAINT "measurements_sensor_device_id_sensor_devices_id_fk"
		FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "measurements_container_id_containers_id_fk"
		FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action
) PARTITION BY RANGE ("measured_at");
--> statement-breakpoint
CREATE TABLE "iot"."measurements_default" PARTITION OF "iot"."measurements" DEFAULT;
--> statement-breakpoint
CREATE INDEX "measurements_container_measured_at_idx" ON "iot"."measurements" USING btree ("container_id","measured_at");
--> statement-breakpoint
CREATE INDEX "measurements_sensor_measured_at_idx" ON "iot"."measurements" USING btree ("sensor_device_id","measured_at");
--> statement-breakpoint
ALTER TABLE "ops"."tours" ADD COLUMN "started_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ops"."tours" ADD COLUMN "completed_at" timestamp with time zone;
--> statement-breakpoint
CREATE TABLE "admin"."alert_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text,
	"warning_fill_percent" integer,
	"critical_fill_percent" integer,
	"anomaly_type_code" text,
	"notify_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recipient_role" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "alert_rules_scope_active_idx" ON "admin"."alert_rules" USING btree ("scope_type","is_active");
--> statement-breakpoint
CREATE TABLE "incident"."alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"container_id" uuid,
	"zone_id" uuid,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_status" text DEFAULT 'open' NOT NULL,
	"acknowledged_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"payload_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "alert_events_rule_id_alert_rules_id_fk"
		FOREIGN KEY ("rule_id") REFERENCES "admin"."alert_rules"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "alert_events_container_id_containers_id_fk"
		FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "alert_events_zone_id_zones_id_fk"
		FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action,
	CONSTRAINT "alert_events_acknowledged_by_user_id_users_id_fk"
		FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "alert_events_status_severity_triggered_idx" ON "incident"."alert_events" USING btree ("current_status","severity","triggered_at");
--> statement-breakpoint
CREATE INDEX "alert_events_container_status_triggered_idx" ON "incident"."alert_events" USING btree ("container_id","current_status","triggered_at");
--> statement-breakpoint
CREATE TABLE "notify"."notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"entity_type" text,
	"entity_id" text,
	"audience_scope" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"preferred_channels" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "notifications_status_scheduled_idx" ON "notify"."notifications" USING btree ("status","scheduled_at");
--> statement-breakpoint
CREATE TABLE "notify"."notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"recipient_address" text NOT NULL,
	"provider_message_id" text,
	"delivery_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk"
		FOREIGN KEY ("notification_id") REFERENCES "notify"."notifications"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX "notification_deliveries_channel_status_attempt_idx" ON "notify"."notification_deliveries" USING btree ("channel","delivery_status","last_attempt_at");
