CREATE SCHEMA "analytics";
--> statement-breakpoint
CREATE SCHEMA "integration";
--> statement-breakpoint
CREATE TABLE "ops"."collection_domain_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"event_name" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_user_id" uuid,
	"routing_key" text DEFAULT '' NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"producer_name" text NOT NULL,
	"producer_transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"traceparent" text,
	"tracestate" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ops"."collection_domain_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration"."event_connector_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connector_name" text NOT NULL,
	"source_type" text NOT NULL,
	"source_record_id" text NOT NULL,
	"event_name" text NOT NULL,
	"routing_key" text DEFAULT '' NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"claimed_by_instance_id" text,
	"output_location" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"traceparent" text,
	"tracestate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."zone_aggregates_10m" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"measurements_count" integer DEFAULT 0 NOT NULL,
	"average_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"min_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"max_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"high_fill_count" integer DEFAULT 0 NOT NULL,
	"trend_slope_per_hour" integer DEFAULT 0 NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"source_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics"."zone_current_state" (
	"zone_id" uuid PRIMARY KEY NOT NULL,
	"latest_aggregate_id" uuid,
	"window_start" timestamp with time zone NOT NULL,
	"window_end" timestamp with time zone NOT NULL,
	"measurements_count" integer DEFAULT 0 NOT NULL,
	"average_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"min_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"max_fill_level_percent" integer DEFAULT 0 NOT NULL,
	"high_fill_count" integer DEFAULT 0 NOT NULL,
	"trend_slope_per_hour" integer DEFAULT 0 NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "incident"."alert_events" ADD COLUMN "source_event_key" text;--> statement-breakpoint
ALTER TABLE "ops"."collection_domain_events" ADD CONSTRAINT "collection_domain_events_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."collection_domain_events" ADD CONSTRAINT "collection_domain_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ops"."collection_domain_snapshots" ADD CONSTRAINT "collection_domain_snapshots_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics"."zone_aggregates_10m" ADD CONSTRAINT "zone_aggregates_10m_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics"."zone_current_state" ADD CONSTRAINT "zone_current_state_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics"."zone_current_state" ADD CONSTRAINT "zone_current_state_latest_aggregate_id_zone_aggregates_10m_id_fk" FOREIGN KEY ("latest_aggregate_id") REFERENCES "analytics"."zone_aggregates_10m"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_domain_events_tour_version_idx" ON "ops"."collection_domain_events" USING btree ("tour_id","aggregate_version");--> statement-breakpoint
CREATE INDEX "collection_domain_events_event_occurred_idx" ON "ops"."collection_domain_events" USING btree ("event_name","occurred_at");--> statement-breakpoint
CREATE INDEX "collection_domain_events_routing_occurred_idx" ON "ops"."collection_domain_events" USING btree ("routing_key","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_domain_snapshots_tour_version_idx" ON "ops"."collection_domain_snapshots" USING btree ("tour_id","aggregate_version");--> statement-breakpoint
CREATE INDEX "collection_domain_snapshots_tour_created_idx" ON "ops"."collection_domain_snapshots" USING btree ("tour_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "event_connector_exports_connector_source_idx" ON "integration"."event_connector_exports" USING btree ("connector_name","source_type","source_record_id");--> statement-breakpoint
CREATE INDEX "event_connector_exports_status_next_attempt_idx" ON "integration"."event_connector_exports" USING btree ("processing_status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "event_connector_exports_connector_status_next_attempt_idx" ON "integration"."event_connector_exports" USING btree ("connector_name","processing_status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "event_connector_exports_event_created_idx" ON "integration"."event_connector_exports" USING btree ("event_name","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "zone_aggregates_10m_zone_window_idx" ON "analytics"."zone_aggregates_10m" USING btree ("zone_id","window_start");--> statement-breakpoint
CREATE INDEX "zone_aggregates_10m_zone_window_end_idx" ON "analytics"."zone_aggregates_10m" USING btree ("zone_id","window_end");--> statement-breakpoint
CREATE INDEX "zone_current_state_aggregate_updated_idx" ON "analytics"."zone_current_state" USING btree ("latest_aggregate_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "alert_events_source_event_key_idx" ON "incident"."alert_events" USING btree ("source_event_key");
