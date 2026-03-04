ALTER TABLE "incident"."citizen_reports" ADD COLUMN "container_code_snapshot" text;
--> statement-breakpoint
ALTER TABLE "incident"."citizen_reports" ADD COLUMN "container_label_snapshot" text;
--> statement-breakpoint
UPDATE "incident"."citizen_reports" AS "report"
SET
  "container_code_snapshot" = "container"."code",
  "container_label_snapshot" = "container"."label"
FROM "core"."containers" AS "container"
WHERE "report"."container_id" = "container"."id"
  AND (
    "report"."container_code_snapshot" IS NULL
    OR "report"."container_label_snapshot" IS NULL
  );
