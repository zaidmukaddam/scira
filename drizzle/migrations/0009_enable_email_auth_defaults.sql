ALTER TABLE "user"
  ALTER COLUMN "email_verified" SET DEFAULT false,
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

UPDATE "user"
SET
  email_verified = COALESCE(email_verified, false),
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE "account"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

UPDATE "account"
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE "session"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

UPDATE "session"
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());

ALTER TABLE "verification"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "updated_at" SET DEFAULT now();

UPDATE "verification"
SET
  created_at = COALESCE(created_at, now()),
  updated_at = COALESCE(updated_at, now());
