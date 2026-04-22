-- Managed Postgres baseline for blank provider-managed Postgres targets.
-- Generated from database/schema/index.ts via `drizzle-kit export`.
-- Regenerate with `npm run db:baseline:managed --workspace=ecotrack-database`.
-- Apply this baseline only to blank managed targets that already reserve provider-owned schemas such as `auth`.
-- Do not apply this file on an existing repo-managed database that already tracks numbered Drizzle migrations.
CREATE SCHEMA "admin";

CREATE SCHEMA "analytics";

CREATE SCHEMA "audit";

CREATE SCHEMA "billing";

CREATE SCHEMA "core";

CREATE SCHEMA "export";

CREATE SCHEMA "game";

CREATE SCHEMA "identity";

CREATE SCHEMA "incident";

CREATE SCHEMA "integration";

CREATE SCHEMA "iot";

CREATE SCHEMA "notify";

CREATE SCHEMA "ops";

CREATE SCHEMA "support";

CREATE TABLE "incident"."alert_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rule_id" uuid,
	"container_id" uuid,
	"zone_id" uuid,
	"source_event_key" text,
	"event_type" text NOT NULL,
	"severity" text DEFAULT 'warning' NOT NULL,
	"triggered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"current_status" text DEFAULT 'open' NOT NULL,
	"acknowledged_by_user_id" uuid,
	"resolved_at" timestamp with time zone,
	"payload_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL
);

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

CREATE TABLE "incident"."anomaly_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"anomaly_type_id" uuid NOT NULL,
	"tour_id" uuid,
	"tour_stop_id" uuid,
	"reporter_user_id" uuid,
	"comments" text,
	"photo_url" text,
	"severity" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'reported' NOT NULL,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "incident"."anomaly_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "anomaly_types_code_unique" UNIQUE("code")
);

CREATE TABLE "support"."attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"file_name" text NOT NULL,
	"file_url" text NOT NULL,
	"content_type" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "audit"."audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text,
	"old_values" jsonb,
	"new_values" jsonb,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_key" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."rate_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"charge_type" text NOT NULL,
	"source_type" text NOT NULL,
	"unit" text DEFAULT 'event' NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"description" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_penalty" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"status" text DEFAULT 'finalized' NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"penalty_total_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" uuid,
	"finalized_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."source_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"line_item_id" uuid NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"rate_rule_id" uuid,
	"charge_type" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "game"."challenge_participations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"challenge_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'enrolled' NOT NULL,
	"reward_granted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "game"."challenges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"target_value" integer NOT NULL,
	"reward_points" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "challenges_code_unique" UNIQUE("code")
);

CREATE TABLE "incident"."citizen_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"container_id" uuid,
	"container_code_snapshot" text,
	"container_label_snapshot" text,
	"reporter_user_id" uuid,
	"status" text DEFAULT 'submitted' NOT NULL,
	"description" text,
	"photo_url" text,
	"latitude" text,
	"longitude" text,
	"reported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "ops"."collection_domain_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"aggregate_version" integer NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ops"."collection_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_stop_id" uuid,
	"container_id" uuid,
	"actor_user_id" uuid,
	"volume_liters" integer,
	"notes" text,
	"latitude" text,
	"longitude" text,
	"collected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "support"."comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "core"."containers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'available' NOT NULL,
	"fill_level_percent" integer DEFAULT 0 NOT NULL,
	"latitude" text NOT NULL,
	"longitude" text NOT NULL,
	"container_type_id" uuid,
	"zone_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "containers_code_unique" UNIQUE("code")
);

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

CREATE TABLE "game"."gamification_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"level" integer DEFAULT 1 NOT NULL,
	"badges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"challenge_progress" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gamification_profiles_user_id_unique" UNIQUE("user_id")
);

CREATE TABLE "iot"."ingestion_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid,
	"device_uid" text NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"routing_key" text DEFAULT '' NOT NULL,
	"shard_id" integer DEFAULT 0 NOT NULL,
	"idempotency_key" text,
	"measured_at" timestamp with time zone NOT NULL,
	"fill_level_percent" integer NOT NULL,
	"temperature_c" integer,
	"battery_percent" integer,
	"signal_strength" integer,
	"measurement_quality" text DEFAULT 'valid' NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"rejection_reason" text,
	"last_error" text,
	"processing_latency_ms" integer,
	"raw_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb,
	"producer_name" text DEFAULT 'iot_ingestion_http' NOT NULL,
	"producer_transaction_id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"claimed_by_instance_id" text,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"last_replayed_at" timestamp with time zone,
	"last_replayed_by_user_id" uuid,
	"last_replay_reason" text,
	"traceparent" text,
	"tracestate" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."invoice_line_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_id" uuid NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"rate_rule_id" uuid,
	"charge_type" text NOT NULL,
	"description" text NOT NULL,
	"quantity" integer NOT NULL,
	"unit" text NOT NULL,
	"unit_price_cents" integer NOT NULL,
	"line_total_cents" integer NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "billing"."invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"billing_run_id" uuid NOT NULL,
	"billing_account_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"status" text DEFAULT 'issued' NOT NULL,
	"bill_to_name" text NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"subtotal_cents" integer DEFAULT 0 NOT NULL,
	"penalty_total_cents" integer DEFAULT 0 NOT NULL,
	"total_cents" integer DEFAULT 0 NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_billing_run_id_unique" UNIQUE("billing_run_id"),
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);

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

CREATE TABLE "iot"."measurements" (
	"id" bigserial NOT NULL,
	"validated_event_id" uuid,
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
	CONSTRAINT "measurements_id_measured_at_pk" PRIMARY KEY("id","measured_at")
) PARTITION BY RANGE ("measured_at");

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
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "identity"."password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "password_reset_tokens_token_hash_unique" UNIQUE("token_hash")
);

CREATE TABLE "export"."report_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requested_by_user_id" uuid,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"selected_kpis" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"format" text DEFAULT 'pdf' NOT NULL,
	"status" text DEFAULT 'generated' NOT NULL,
	"send_email" boolean DEFAULT false NOT NULL,
	"email_to" text,
	"file_content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "identity"."roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"permissions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);

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
	CONSTRAINT "sensor_devices_device_uid_unique" UNIQUE("device_uid")
);

CREATE TABLE "admin"."system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"is_public" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "support"."tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"support_category" text DEFAULT 'general_help' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"requester_id" uuid NOT NULL,
	"assignee_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone
);

CREATE TABLE "ops"."tour_routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"geometry" jsonb NOT NULL,
	"distance_meters" integer,
	"duration_minutes" integer,
	"source" text DEFAULT 'fallback' NOT NULL,
	"provider" text DEFAULT 'internal' NOT NULL,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tour_routes_tour_id_unique" UNIQUE("tour_id")
);

CREATE TABLE "ops"."tour_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tour_id" uuid NOT NULL,
	"container_id" uuid NOT NULL,
	"stop_order" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"eta" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "ops"."tours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'planned' NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"zone_id" uuid,
	"assigned_agent_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "identity"."user_roles" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_user_id_role_id_pk" PRIMARY KEY("user_id","role_id")
);

CREATE TABLE "identity"."users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"auth_provider" text DEFAULT 'google' NOT NULL,
	"google_id" text,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"role" text DEFAULT 'citizen' NOT NULL,
	"zone_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_google_id_unique" UNIQUE("google_id")
);

CREATE TABLE "iot"."validated_event_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"consumer_name" text NOT NULL,
	"validated_event_id" uuid NOT NULL,
	"processing_status" text DEFAULT 'pending' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processing_started_at" timestamp with time zone,
	"processed_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"last_error" text,
	"event_name" text DEFAULT 'iot.measurement.validated' NOT NULL,
	"routing_key" text DEFAULT '' NOT NULL,
	"shard_id" integer DEFAULT 0 NOT NULL,
	"claimed_by_instance_id" text,
	"replay_count" integer DEFAULT 0 NOT NULL,
	"last_replayed_at" timestamp with time zone,
	"last_replayed_by_user_id" uuid,
	"last_replay_reason" text,
	"traceparent" text,
	"tracestate" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "iot"."validated_measurement_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_event_id" uuid NOT NULL,
	"device_uid" text NOT NULL,
	"sensor_device_id" uuid,
	"container_id" uuid,
	"measured_at" timestamp with time zone NOT NULL,
	"fill_level_percent" integer NOT NULL,
	"temperature_c" integer,
	"battery_percent" integer,
	"signal_strength" integer,
	"measurement_quality" text DEFAULT 'valid' NOT NULL,
	"warning_threshold" integer,
	"critical_threshold" integer,
	"validation_summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"normalized_payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"event_name" text DEFAULT 'iot.measurement.validated' NOT NULL,
	"routing_key" text DEFAULT '' NOT NULL,
	"shard_id" integer DEFAULT 0 NOT NULL,
	"schema_version" text DEFAULT 'v1' NOT NULL,
	"producer_name" text DEFAULT 'iot_ingestion_worker' NOT NULL,
	"producer_transaction_id" uuid,
	"traceparent" text,
	"tracestate" text,
	"emitted_at" timestamp with time zone DEFAULT now() NOT NULL
);

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

CREATE TABLE "core"."zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" text NOT NULL,
	"description" text,
	"depot_label" text NOT NULL,
	"depot_latitude" text NOT NULL,
	"depot_longitude" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "zones_code_unique" UNIQUE("code")
);

ALTER TABLE "incident"."alert_events" ADD CONSTRAINT "alert_events_rule_id_alert_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "admin"."alert_rules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."alert_events" ADD CONSTRAINT "alert_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."alert_events" ADD CONSTRAINT "alert_events_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."alert_events" ADD CONSTRAINT "alert_events_acknowledged_by_user_id_users_id_fk" FOREIGN KEY ("acknowledged_by_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."anomaly_reports" ADD CONSTRAINT "anomaly_reports_anomaly_type_id_anomaly_types_id_fk" FOREIGN KEY ("anomaly_type_id") REFERENCES "incident"."anomaly_types"("id") ON DELETE restrict ON UPDATE no action;
ALTER TABLE "incident"."anomaly_reports" ADD CONSTRAINT "anomaly_reports_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."anomaly_reports" ADD CONSTRAINT "anomaly_reports_tour_stop_id_tour_stops_id_fk" FOREIGN KEY ("tour_stop_id") REFERENCES "ops"."tour_stops"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."anomaly_reports" ADD CONSTRAINT "anomaly_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "support"."attachments" ADD CONSTRAINT "attachments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "support"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "audit"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "billing"."rate_rules" ADD CONSTRAINT "rate_rules_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."runs" ADD CONSTRAINT "runs_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."runs" ADD CONSTRAINT "runs_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "source_allocations_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "source_allocations_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "source_allocations_line_item_id_invoice_line_items_id_fk" FOREIGN KEY ("line_item_id") REFERENCES "billing"."invoice_line_items"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "source_allocations_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."source_allocations" ADD CONSTRAINT "source_allocations_rate_rule_id_rate_rules_id_fk" FOREIGN KEY ("rate_rule_id") REFERENCES "billing"."rate_rules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "game"."challenge_participations" ADD CONSTRAINT "challenge_participations_challenge_id_challenges_id_fk" FOREIGN KEY ("challenge_id") REFERENCES "game"."challenges"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "game"."challenge_participations" ADD CONSTRAINT "challenge_participations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "incident"."citizen_reports" ADD CONSTRAINT "citizen_reports_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "incident"."citizen_reports" ADD CONSTRAINT "citizen_reports_reporter_user_id_users_id_fk" FOREIGN KEY ("reporter_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."collection_domain_events" ADD CONSTRAINT "collection_domain_events_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ops"."collection_domain_events" ADD CONSTRAINT "collection_domain_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."collection_domain_snapshots" ADD CONSTRAINT "collection_domain_snapshots_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ops"."collection_events" ADD CONSTRAINT "collection_events_tour_stop_id_tour_stops_id_fk" FOREIGN KEY ("tour_stop_id") REFERENCES "ops"."tour_stops"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."collection_events" ADD CONSTRAINT "collection_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."collection_events" ADD CONSTRAINT "collection_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "support"."comments" ADD CONSTRAINT "comments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "support"."tickets"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support"."comments" ADD CONSTRAINT "comments_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "core"."containers" ADD CONSTRAINT "containers_container_type_id_container_types_id_fk" FOREIGN KEY ("container_type_id") REFERENCES "core"."container_types"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "core"."containers" ADD CONSTRAINT "containers_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "game"."gamification_profiles" ADD CONSTRAINT "gamification_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."ingestion_events" ADD CONSTRAINT "ingestion_events_last_replayed_by_user_id_users_id_fk" FOREIGN KEY ("last_replayed_by_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "billing"."invoices"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."invoice_line_items" ADD CONSTRAINT "invoice_line_items_rate_rule_id_rate_rules_id_fk" FOREIGN KEY ("rate_rule_id") REFERENCES "billing"."rate_rules"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "invoices_billing_run_id_runs_id_fk" FOREIGN KEY ("billing_run_id") REFERENCES "billing"."runs"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "billing"."invoices" ADD CONSTRAINT "invoices_billing_account_id_accounts_id_fk" FOREIGN KEY ("billing_account_id") REFERENCES "billing"."accounts"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_validated_event_id_validated_measurement_events_id_fk" FOREIGN KEY ("validated_event_id") REFERENCES "iot"."validated_measurement_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."measurement_rollups_10m" ADD CONSTRAINT "measurement_rollups_10m_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."measurements" ADD CONSTRAINT "measurements_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."measurements" ADD CONSTRAINT "measurements_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "notify"."notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "notify"."notifications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notify"."notification_devices" ADD CONSTRAINT "notification_devices_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notify"."notification_recipients" ADD CONSTRAINT "notification_recipients_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "notify"."notifications"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "notify"."notification_recipients" ADD CONSTRAINT "notification_recipients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "identity"."password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "export"."report_exports" ADD CONSTRAINT "report_exports_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."sensor_devices" ADD CONSTRAINT "sensor_devices_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "admin"."system_settings" ADD CONSTRAINT "system_settings_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "support"."tickets" ADD CONSTRAINT "tickets_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "support"."tickets" ADD CONSTRAINT "tickets_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."tour_routes" ADD CONSTRAINT "tour_routes_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ops"."tour_stops" ADD CONSTRAINT "tour_stops_tour_id_tours_id_fk" FOREIGN KEY ("tour_id") REFERENCES "ops"."tours"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ops"."tour_stops" ADD CONSTRAINT "tour_stops_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "ops"."tours" ADD CONSTRAINT "tours_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "ops"."tours" ADD CONSTRAINT "tours_assigned_agent_id_users_id_fk" FOREIGN KEY ("assigned_agent_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "identity"."user_roles" ADD CONSTRAINT "user_roles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "identity"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "identity"."user_roles" ADD CONSTRAINT "user_roles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "identity"."roles"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "identity"."users" ADD CONSTRAINT "users_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."validated_event_deliveries" ADD CONSTRAINT "validated_event_deliveries_validated_event_id_validated_measurement_events_id_fk" FOREIGN KEY ("validated_event_id") REFERENCES "iot"."validated_measurement_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iot"."validated_event_deliveries" ADD CONSTRAINT "validated_event_deliveries_last_replayed_by_user_id_users_id_fk" FOREIGN KEY ("last_replayed_by_user_id") REFERENCES "identity"."users"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_source_event_id_ingestion_events_id_fk" FOREIGN KEY ("source_event_id") REFERENCES "iot"."ingestion_events"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_sensor_device_id_sensor_devices_id_fk" FOREIGN KEY ("sensor_device_id") REFERENCES "iot"."sensor_devices"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "iot"."validated_measurement_events" ADD CONSTRAINT "validated_measurement_events_container_id_containers_id_fk" FOREIGN KEY ("container_id") REFERENCES "core"."containers"("id") ON DELETE set null ON UPDATE no action;
ALTER TABLE "analytics"."zone_aggregates_10m" ADD CONSTRAINT "zone_aggregates_10m_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "analytics"."zone_current_state" ADD CONSTRAINT "zone_current_state_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "analytics"."zone_current_state" ADD CONSTRAINT "zone_current_state_latest_aggregate_id_zone_aggregates_10m_id_fk" FOREIGN KEY ("latest_aggregate_id") REFERENCES "analytics"."zone_aggregates_10m"("id") ON DELETE set null ON UPDATE no action;
CREATE INDEX "alert_events_status_severity_triggered_idx" ON "incident"."alert_events" USING btree ("current_status","severity","triggered_at");
CREATE INDEX "alert_events_container_status_triggered_idx" ON "incident"."alert_events" USING btree ("container_id","current_status","triggered_at");
CREATE UNIQUE INDEX "alert_events_source_event_key_idx" ON "incident"."alert_events" USING btree ("source_event_key");
CREATE INDEX "alert_rules_scope_active_idx" ON "admin"."alert_rules" USING btree ("scope_type","is_active");
CREATE INDEX "anomaly_reports_reported_at_idx" ON "incident"."anomaly_reports" USING btree ("reported_at");
CREATE INDEX "anomaly_reports_type_reported_at_idx" ON "incident"."anomaly_reports" USING btree ("anomaly_type_id","reported_at");
CREATE INDEX "audit_logs_created_at_idx" ON "audit"."audit_logs" USING btree ("created_at");
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit"."audit_logs" USING btree ("action","created_at");
CREATE INDEX "audit_logs_resource_type_created_at_idx" ON "audit"."audit_logs" USING btree ("resource_type","created_at");
CREATE INDEX "audit_logs_user_created_at_idx" ON "audit"."audit_logs" USING btree ("user_id","created_at");
CREATE UNIQUE INDEX "billing_accounts_scope_idx" ON "billing"."accounts" USING btree ("scope_type","scope_key");
CREATE INDEX "billing_accounts_active_scope_idx" ON "billing"."accounts" USING btree ("is_active","scope_type");
CREATE UNIQUE INDEX "billing_rate_rules_account_charge_idx" ON "billing"."rate_rules" USING btree ("billing_account_id","charge_type");
CREATE INDEX "billing_rate_rules_active_source_idx" ON "billing"."rate_rules" USING btree ("billing_account_id","is_active","source_type");
CREATE UNIQUE INDEX "billing_runs_account_period_idx" ON "billing"."runs" USING btree ("billing_account_id","period_start","period_end");
CREATE INDEX "billing_runs_status_created_idx" ON "billing"."runs" USING btree ("status","created_at");
CREATE UNIQUE INDEX "billing_source_allocations_account_charge_source_idx" ON "billing"."source_allocations" USING btree ("billing_account_id","charge_type","source_type","source_id");
CREATE INDEX "billing_source_allocations_run_source_idx" ON "billing"."source_allocations" USING btree ("billing_run_id","source_type","source_id");
CREATE INDEX "citizen_reports_container_reported_at_idx" ON "incident"."citizen_reports" USING btree ("container_id","reported_at");
CREATE INDEX "citizen_reports_reporter_status_reported_at_idx" ON "incident"."citizen_reports" USING btree ("reporter_user_id","status","reported_at");
CREATE UNIQUE INDEX "collection_domain_events_tour_version_idx" ON "ops"."collection_domain_events" USING btree ("tour_id","aggregate_version");
CREATE INDEX "collection_domain_events_event_occurred_idx" ON "ops"."collection_domain_events" USING btree ("event_name","occurred_at");
CREATE INDEX "collection_domain_events_routing_occurred_idx" ON "ops"."collection_domain_events" USING btree ("routing_key","occurred_at");
CREATE UNIQUE INDEX "collection_domain_snapshots_tour_version_idx" ON "ops"."collection_domain_snapshots" USING btree ("tour_id","aggregate_version");
CREATE INDEX "collection_domain_snapshots_tour_created_idx" ON "ops"."collection_domain_snapshots" USING btree ("tour_id","created_at");
CREATE INDEX "collection_events_collected_at_idx" ON "ops"."collection_events" USING btree ("collected_at");
CREATE INDEX "collection_events_container_collected_at_idx" ON "ops"."collection_events" USING btree ("container_id","collected_at");
CREATE UNIQUE INDEX "event_connector_exports_connector_source_idx" ON "integration"."event_connector_exports" USING btree ("connector_name","source_type","source_record_id");
CREATE INDEX "event_connector_exports_status_next_attempt_idx" ON "integration"."event_connector_exports" USING btree ("processing_status","next_attempt_at");
CREATE INDEX "event_connector_exports_connector_status_next_attempt_idx" ON "integration"."event_connector_exports" USING btree ("connector_name","processing_status","next_attempt_at");
CREATE INDEX "event_connector_exports_event_created_idx" ON "integration"."event_connector_exports" USING btree ("event_name","created_at");
CREATE INDEX "ingestion_events_status_next_attempt_idx" ON "iot"."ingestion_events" USING btree ("processing_status","next_attempt_at");
CREATE INDEX "ingestion_events_device_measured_at_idx" ON "iot"."ingestion_events" USING btree ("device_uid","measured_at");
CREATE INDEX "ingestion_events_batch_idx" ON "iot"."ingestion_events" USING btree ("batch_id");
CREATE INDEX "ingestion_events_shard_status_next_attempt_idx" ON "iot"."ingestion_events" USING btree ("shard_id","processing_status","next_attempt_at");
CREATE UNIQUE INDEX "ingestion_events_device_idempotency_idx" ON "iot"."ingestion_events" USING btree ("device_uid","idempotency_key");
CREATE INDEX "billing_invoice_line_items_invoice_created_idx" ON "billing"."invoice_line_items" USING btree ("invoice_id","created_at");
CREATE INDEX "billing_invoices_account_issued_idx" ON "billing"."invoices" USING btree ("billing_account_id","issued_at");
CREATE INDEX "measurement_rollups_10m_container_window_end_idx" ON "iot"."measurement_rollups_10m" USING btree ("container_id","window_end");
CREATE INDEX "measurement_rollups_10m_device_window_end_idx" ON "iot"."measurement_rollups_10m" USING btree ("device_uid","window_end");
CREATE UNIQUE INDEX "measurements_validated_event_measured_at_idx" ON "iot"."measurements" USING btree ("validated_event_id","measured_at");
CREATE INDEX "measurements_container_measured_at_idx" ON "iot"."measurements" USING btree ("container_id","measured_at");
CREATE INDEX "measurements_sensor_measured_at_idx" ON "iot"."measurements" USING btree ("sensor_device_id","measured_at");
CREATE INDEX "notification_deliveries_channel_status_attempt_idx" ON "notify"."notification_deliveries" USING btree ("channel","delivery_status","last_attempt_at");
CREATE INDEX "notification_deliveries_notification_created_idx" ON "notify"."notification_deliveries" USING btree ("notification_id","created_at");
CREATE UNIQUE INDEX "notification_devices_provider_token_idx" ON "notify"."notification_devices" USING btree ("provider","push_token");
CREATE INDEX "notification_devices_user_status_idx" ON "notify"."notification_devices" USING btree ("user_id","status","last_seen_at");
CREATE UNIQUE INDEX "notification_recipients_notification_user_idx" ON "notify"."notification_recipients" USING btree ("notification_id","user_id");
CREATE INDEX "notification_recipients_user_status_created_idx" ON "notify"."notification_recipients" USING btree ("user_id","status","created_at");
CREATE INDEX "notifications_created_at_idx" ON "notify"."notifications" USING btree ("created_at");
CREATE INDEX "notifications_status_scheduled_idx" ON "notify"."notifications" USING btree ("status","scheduled_at");
CREATE INDEX "report_exports_created_at_idx" ON "export"."report_exports" USING btree ("created_at");
CREATE INDEX "report_exports_requester_created_at_idx" ON "export"."report_exports" USING btree ("requested_by_user_id","created_at");
CREATE INDEX "sensor_devices_container_last_seen_idx" ON "iot"."sensor_devices" USING btree ("container_id","last_seen_at");
CREATE INDEX "tickets_created_at_idx" ON "support"."tickets" USING btree ("created_at");
CREATE INDEX "tickets_status_created_at_idx" ON "support"."tickets" USING btree ("status","created_at");
CREATE INDEX "tickets_priority_created_at_idx" ON "support"."tickets" USING btree ("priority","created_at");
CREATE INDEX "tickets_support_category_created_at_idx" ON "support"."tickets" USING btree ("support_category","created_at");
CREATE INDEX "tickets_assignee_created_at_idx" ON "support"."tickets" USING btree ("assignee_id","created_at");
CREATE INDEX "tours_scheduled_for_idx" ON "ops"."tours" USING btree ("scheduled_for");
CREATE INDEX "tours_zone_scheduled_for_idx" ON "ops"."tours" USING btree ("zone_id","scheduled_for");
CREATE INDEX "users_zone_id_idx" ON "identity"."users" USING btree ("zone_id");
CREATE UNIQUE INDEX "validated_event_deliveries_consumer_event_idx" ON "iot"."validated_event_deliveries" USING btree ("consumer_name","validated_event_id");
CREATE INDEX "validated_event_deliveries_status_next_attempt_idx" ON "iot"."validated_event_deliveries" USING btree ("processing_status","next_attempt_at");
CREATE INDEX "validated_event_deliveries_consumer_shard_status_next_attempt_idx" ON "iot"."validated_event_deliveries" USING btree ("consumer_name","shard_id","processing_status","next_attempt_at");
CREATE UNIQUE INDEX "validated_measurement_events_source_event_idx" ON "iot"."validated_measurement_events" USING btree ("source_event_id");
CREATE INDEX "validated_measurement_events_container_measured_at_idx" ON "iot"."validated_measurement_events" USING btree ("container_id","measured_at");
CREATE INDEX "validated_measurement_events_sensor_measured_at_idx" ON "iot"."validated_measurement_events" USING btree ("sensor_device_id","measured_at");
CREATE INDEX "validated_measurement_events_shard_emitted_at_idx" ON "iot"."validated_measurement_events" USING btree ("shard_id","emitted_at");
CREATE UNIQUE INDEX "zone_aggregates_10m_zone_window_idx" ON "analytics"."zone_aggregates_10m" USING btree ("zone_id","window_start");
CREATE INDEX "zone_aggregates_10m_zone_window_end_idx" ON "analytics"."zone_aggregates_10m" USING btree ("zone_id","window_end");
CREATE INDEX "zone_current_state_aggregate_updated_idx" ON "analytics"."zone_current_state" USING btree ("latest_aggregate_id","updated_at");
CREATE INDEX "zone_current_state_updated_at_idx" ON "analytics"."zone_current_state" USING btree ("updated_at");


-- Manual supplement for historical partitioned storage not represented in Drizzle export.
CREATE TABLE IF NOT EXISTS "iot"."measurements_default" PARTITION OF "iot"."measurements" DEFAULT;
