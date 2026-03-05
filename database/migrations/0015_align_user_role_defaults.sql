ALTER TABLE "auth"."users" ALTER COLUMN "role" SET DEFAULT 'citizen';
--> statement-breakpoint
INSERT INTO "admin"."system_settings" ("key", "value", "description", "is_public")
VALUES ('default_user_role', '"citizen"'::jsonb, 'Default role for new users', false)
ON CONFLICT ("key") DO UPDATE
SET
  "value" = EXCLUDED."value",
  "description" = EXCLUDED."description",
  "is_public" = EXCLUDED."is_public",
  "updated_at" = now();
--> statement-breakpoint
UPDATE "auth"."users"
SET
  "role" = 'citizen',
  "updated_at" = now()
WHERE lower("role") = 'user';
--> statement-breakpoint
INSERT INTO "auth"."user_roles" ("user_id", "role_id", "created_at")
SELECT
  "users"."id",
  "roles"."id",
  now()
FROM "auth"."users"
INNER JOIN "auth"."roles" ON lower("roles"."name") = lower("users"."role")
LEFT JOIN "auth"."user_roles"
  ON "user_roles"."user_id" = "users"."id"
 AND "user_roles"."role_id" = "roles"."id"
WHERE "user_roles"."user_id" IS NULL;
