ALTER TABLE "auth"."users" ADD COLUMN "zone_id" uuid;--> statement-breakpoint
ALTER TABLE "core"."zones" ADD COLUMN "depot_label" text;--> statement-breakpoint
ALTER TABLE "core"."zones" ADD COLUMN "depot_latitude" text;--> statement-breakpoint
ALTER TABLE "core"."zones" ADD COLUMN "depot_longitude" text;--> statement-breakpoint

WITH zone_depots AS (
  SELECT
    "zone_id",
    ROUND(AVG(("latitude")::numeric), 6)::text AS "depot_latitude",
    ROUND(AVG(("longitude")::numeric), 6)::text AS "depot_longitude"
  FROM "core"."containers"
  WHERE "zone_id" IS NOT NULL
    AND "latitude" IS NOT NULL
    AND "longitude" IS NOT NULL
  GROUP BY "zone_id"
)
UPDATE "core"."zones" AS "zones"
SET
  "depot_label" = CONCAT('Depot ', "zones"."name"),
  "depot_latitude" = "zone_depots"."depot_latitude",
  "depot_longitude" = "zone_depots"."depot_longitude"
FROM "zone_depots"
WHERE "zone_depots"."zone_id" = "zones"."id";--> statement-breakpoint

UPDATE "auth"."users" AS "users"
SET "zone_id" = "zones"."id"
FROM "core"."zones" AS "zones"
WHERE "zones"."code" = 'ZONE-DOWNTOWN'
  AND "users"."email" IN ('agent@example.com', 'test@ecotrack.local')
  AND ("users"."zone_id" IS NULL OR "users"."zone_id" <> "zones"."id");--> statement-breakpoint

ALTER TABLE "core"."containers" ALTER COLUMN "latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."containers" ALTER COLUMN "longitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."zones" ALTER COLUMN "depot_label" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."zones" ALTER COLUMN "depot_latitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "core"."zones" ALTER COLUMN "depot_longitude" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "auth"."users" ADD CONSTRAINT "users_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "core"."zones"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_zone_id_idx" ON "auth"."users" USING btree ("zone_id");
