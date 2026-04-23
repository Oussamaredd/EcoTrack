DO $$
BEGIN
  IF to_regclass('auth.users') IS NULL THEN
    EXECUTE 'CREATE SCHEMA IF NOT EXISTS "auth"';
    EXECUTE 'CREATE TABLE "auth"."users" ("id" uuid PRIMARY KEY)';
  END IF;
END
$$;

ALTER TABLE "identity"."users" ADD COLUMN IF NOT EXISTS "auth_user_id" uuid;

CREATE UNIQUE INDEX IF NOT EXISTS "users_auth_user_id_unique" ON "identity"."users" USING btree ("auth_user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_auth_user_id_auth_users_id_fk'
  ) THEN
    ALTER TABLE "identity"."users"
      ADD CONSTRAINT "users_auth_user_id_auth_users_id_fk"
      FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END
$$;
