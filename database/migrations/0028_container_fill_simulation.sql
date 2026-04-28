ALTER TABLE "core"."containers" ADD COLUMN "fill_rate_per_hour" integer DEFAULT 8 NOT NULL;
--> statement-breakpoint
ALTER TABLE "core"."containers" ADD COLUMN "last_measurement_at" timestamp with time zone DEFAULT now() NOT NULL;
--> statement-breakpoint
ALTER TABLE "core"."containers" ADD COLUMN "last_collected_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "core"."containers"
SET
  "fill_rate_per_hour" = 4 + (ascii(substr("code", greatest(length("code") - 1, 1), 1)) % 9),
  "last_measurement_at" = now() - ((length("code") % 360) || ' minutes')::interval,
  "last_collected_at" = CASE WHEN "fill_level_percent" = 0 THEN now() ELSE NULL END;
