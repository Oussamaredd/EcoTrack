ALTER TABLE "identity"."users" ADD COLUMN "auth_user_id" uuid;

CREATE UNIQUE INDEX "users_auth_user_id_unique" ON "identity"."users" USING btree ("auth_user_id");

ALTER TABLE "identity"."users"
  ADD CONSTRAINT "users_auth_user_id_auth_users_id_fk"
  FOREIGN KEY ("auth_user_id") REFERENCES "auth"."users"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
