DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'auth'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'identity'
  ) THEN
    EXECUTE 'ALTER SCHEMA "auth" RENAME TO "identity"';
  END IF;
END
$$;
