-- Admin Dashboard V1 schema changes

-- Extend user table
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "role" varchar NOT NULL DEFAULT 'user';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "status" varchar NOT NULL DEFAULT 'active';
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "last_seen" timestamp NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ip_address" text NULL;
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "geo" jsonb NULL;

-- Create event table
CREATE TABLE IF NOT EXISTS "event" (
  "id" text PRIMARY KEY,
  "category" varchar NOT NULL,
  "type" text NOT NULL,
  "message" text,
  "metadata" jsonb,
  "user_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Indexes for event
CREATE INDEX IF NOT EXISTS "event_category_idx" ON "event" ("category");
CREATE INDEX IF NOT EXISTS "event_created_at_idx" ON "event" ("created_at");
