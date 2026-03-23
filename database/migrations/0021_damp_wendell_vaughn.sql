CREATE TABLE "iot"."measurement_rollups_10m" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validated_event_id" uuid NOT NULL,
	"device_uid" text NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"measurement_count" integer DEFAULT 1 NOT NULL,
	"average_fill_level_percent" integer NOT NULL,
	"fill_level_delta_percent" integer NOT NULL,
	"sensor_health_score" integer NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "measurement_rollups_10m_validated_event_id_unique" UNIQUE("validated_event_id")
);
--> statement-breakpoint
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_validated_event_id_validated_measurement_events_id_fk" FOREIGN KEY ("validated_event_id") REFERENCES "iot"."validated_measurement_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "measurement_rollups_10m_container_window_end_idx" ON "iot"."measurement_rollups_10m" USING btree ("container_id","window_end");--> statement-breakpoint
CREATE INDEX "measurement_rollups_10m_device_window_end_idx" ON "iot"."measurement_rollups_10m" USING btree ("device_uid","window_end");