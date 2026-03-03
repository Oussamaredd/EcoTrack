CREATE SCHEMA IF NOT EXISTS "auth";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "core";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "iot";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "ops";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "incident";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "notify";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "game";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "audit";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "admin";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "export";
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "support";
--> statement-breakpoint
ALTER TABLE "public"."users" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."password_reset_tokens" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."roles" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."user_roles" SET SCHEMA "auth";
--> statement-breakpoint
ALTER TABLE "public"."zones" SET SCHEMA "core";
--> statement-breakpoint
ALTER TABLE "public"."containers" SET SCHEMA "core";
--> statement-breakpoint
ALTER TABLE "public"."tours" SET SCHEMA "ops";
--> statement-breakpoint
ALTER TABLE "public"."tour_stops" SET SCHEMA "ops";
--> statement-breakpoint
ALTER TABLE "public"."tour_routes" SET SCHEMA "ops";
--> statement-breakpoint
ALTER TABLE "public"."collection_events" SET SCHEMA "ops";
--> statement-breakpoint
ALTER TABLE "public"."citizen_reports" SET SCHEMA "incident";
--> statement-breakpoint
ALTER TABLE "public"."anomaly_types" SET SCHEMA "incident";
--> statement-breakpoint
ALTER TABLE "public"."anomaly_reports" SET SCHEMA "incident";
--> statement-breakpoint
ALTER TABLE "public"."gamification_profiles" SET SCHEMA "game";
--> statement-breakpoint
ALTER TABLE "public"."challenges" SET SCHEMA "game";
--> statement-breakpoint
ALTER TABLE "public"."challenge_participations" SET SCHEMA "game";
--> statement-breakpoint
ALTER TABLE "public"."audit_logs" SET SCHEMA "audit";
--> statement-breakpoint
ALTER TABLE "public"."system_settings" SET SCHEMA "admin";
--> statement-breakpoint
ALTER TABLE "public"."report_exports" SET SCHEMA "export";
--> statement-breakpoint
ALTER TABLE "public"."tickets" SET SCHEMA "support";
--> statement-breakpoint
ALTER TABLE "public"."comments" SET SCHEMA "support";
--> statement-breakpoint
ALTER TABLE "public"."attachments" SET SCHEMA "support";
