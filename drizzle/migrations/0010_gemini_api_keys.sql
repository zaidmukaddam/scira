-- Gemini API Key Management Tables

-- Create gemini_api_keys table
CREATE TABLE IF NOT EXISTS "gemini_api_keys" (
  "id" text PRIMARY KEY,
  "key" text NOT NULL UNIQUE,
  "display_name" text,
  "is_active" boolean NOT NULL DEFAULT false,
  "is_primary" boolean NOT NULL DEFAULT false,
  "enabled" boolean NOT NULL DEFAULT true,
  "priority" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  "last_used_at" timestamp NULL,
  "last_error_at" timestamp NULL
);

-- Create api_key_usage table
CREATE TABLE IF NOT EXISTS "api_key_usage" (
  "id" text PRIMARY KEY,
  "api_key_id" text NOT NULL REFERENCES "gemini_api_keys"("id") ON DELETE CASCADE,
  "date" text NOT NULL,
  "message_count" integer NOT NULL DEFAULT 0,
  "api_call_count" integer NOT NULL DEFAULT 0,
  "tokens_used" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "gemini_api_keys_is_active_idx" ON "gemini_api_keys" ("is_active");
CREATE INDEX IF NOT EXISTS "gemini_api_keys_enabled_idx" ON "gemini_api_keys" ("enabled");
CREATE INDEX IF NOT EXISTS "gemini_api_keys_priority_idx" ON "gemini_api_keys" ("priority");
CREATE INDEX IF NOT EXISTS "api_key_usage_api_key_id_date_idx" ON "api_key_usage" ("api_key_id", "date");
CREATE INDEX IF NOT EXISTS "api_key_usage_date_idx" ON "api_key_usage" ("date");
