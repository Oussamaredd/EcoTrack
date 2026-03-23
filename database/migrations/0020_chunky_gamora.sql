ALTER TABLE "iot"."ingestion_events" ADD COLUMN "routing_key" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "shard_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "replay_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "last_replayed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "last_replayed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD COLUMN "last_replay_reason" text;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "shard_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "replay_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "last_replayed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "last_replayed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD COLUMN "last_replay_reason" text;--> statement-breakpoint
ALTER TABLE "iot"."validated_measurement_events" ADD COLUMN "shard_id" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_last_replayed_by_user_id_users_id_fk" FOREIGN KEY ("last_replayed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "iot"."validated_event_deliveries" ADD CONSTRAINT "validated_event_deliveries_last_replayed_by_user_id_users_id_fk" FOREIGN KEY ("last_replayed_by_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ingestion_events_shard_status_next_attempt_idx" ON "iot"."ingestion_events" USING btree ("shard_id","processing_status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "validated_event_deliveries_consumer_shard_status_next_attempt_idx" ON "iot"."validated_event_deliveries" USING btree ("consumer_name","shard_id","processing_status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "validated_measurement_events_shard_emitted_at_idx" ON "iot"."validated_measurement_events" USING btree ("shard_id","emitted_at");