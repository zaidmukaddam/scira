-- SCX.ai — Create missing tables & add optional tracking columns
-- Run this in the Supabase SQL Editor to create all tables that don't yet exist in the database.
-- All statements use CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so they are safe to re-run.

-- ─── Optional: Add token/model tracking columns to the message table ──────────
-- Uncomment these lines if you want per-message model and token tracking.
-- ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "model" text;
-- ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "input_tokens" integer;
-- ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "output_tokens" integer;
-- ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "total_tokens" integer;
-- ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "completion_time" real;

-- Extreme search usage tracking
CREATE TABLE IF NOT EXISTS "extreme_search_usage" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "search_count" integer NOT NULL DEFAULT 0,
  "date" timestamp NOT NULL DEFAULT now(),
  "reset_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Message usage tracking
CREATE TABLE IF NOT EXISTS "message_usage" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "message_count" integer NOT NULL DEFAULT 0,
  "date" timestamp NOT NULL DEFAULT now(),
  "reset_at" timestamp NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Custom instructions
CREATE TABLE IF NOT EXISTS "custom_instructions" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "content" text NOT NULL,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- User preferences
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL UNIQUE REFERENCES "user"("id") ON DELETE CASCADE,
  "preferences" jsonb NOT NULL DEFAULT '{}',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Lookout (scheduled searches)
CREATE TABLE IF NOT EXISTS "lookout" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "title" text NOT NULL,
  "prompt" text NOT NULL,
  "frequency" text NOT NULL,
  "cron_schedule" text NOT NULL,
  "timezone" text NOT NULL DEFAULT 'UTC',
  "next_run_at" timestamp NOT NULL,
  "qstash_schedule_id" text,
  "status" text NOT NULL DEFAULT 'active',
  "last_run_at" timestamp,
  "last_run_chat_id" text,
  "run_history" jsonb DEFAULT '[]',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- User files (for RAG / file management)
CREATE TABLE IF NOT EXISTS "user_file" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "filename" text NOT NULL,
  "original_name" text NOT NULL,
  "file_type" text NOT NULL,
  "file_size" integer NOT NULL,
  "file_path" text NOT NULL,
  "file_url" text NOT NULL,
  "chat_id" text REFERENCES "chat"("id") ON DELETE SET NULL,
  "message_id" text REFERENCES "message"("id") ON DELETE SET NULL,
  "rag_status" varchar(50) DEFAULT 'pending',
  "rag_processed_at" timestamp,
  "rag_error" text,
  "chunk_count" integer DEFAULT 0,
  "extracted_text" text,
  "extracted_text_length" integer,
  "metadata" jsonb,
  "source" varchar(50) DEFAULT 'chat',
  "uploaded_at" timestamp NOT NULL DEFAULT now(),
  "last_accessed_at" timestamp
);

-- File chunks (for RAG embeddings)
CREATE TABLE IF NOT EXISTS "file_chunk" (
  "id" text PRIMARY KEY NOT NULL,
  "file_id" text NOT NULL REFERENCES "user_file"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "chunk_index" integer NOT NULL,
  "content" text NOT NULL,
  "content_length" integer NOT NULL,
  "embedding" jsonb,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Feedback categories
CREATE TABLE IF NOT EXISTS "feedback_categories" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL UNIQUE,
  "description" text,
  "display_order" integer DEFAULT 0,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- User feedback
CREATE TABLE IF NOT EXISTS "user_feedback" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "category_id" text REFERENCES "feedback_categories"("id") ON DELETE SET NULL,
  "type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "page_url" text NOT NULL,
  "user_agent" text,
  "browser_info" jsonb,
  "viewport_size" jsonb,
  "previous_page" text,
  "session_duration" integer,
  "action_context" jsonb,
  "screenshot_url" text,
  "attachments" jsonb DEFAULT '[]',
  "status" text NOT NULL DEFAULT 'new',
  "priority" text DEFAULT 'medium',
  "admin_notes" text,
  "resolved_by" text REFERENCES "user"("id") ON DELETE SET NULL,
  "resolved_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Feedback updates
CREATE TABLE IF NOT EXISTS "feedback_updates" (
  "id" text PRIMARY KEY NOT NULL,
  "feedback_id" text NOT NULL REFERENCES "user_feedback"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "update_type" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "comment" text,
  "is_internal" boolean DEFAULT false,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- Feedback email queue
CREATE TABLE IF NOT EXISTS "feedback_email_queue" (
  "id" text PRIMARY KEY NOT NULL,
  "feedback_id" text NOT NULL REFERENCES "user_feedback"("id") ON DELETE CASCADE,
  "recipient_email" text NOT NULL,
  "email_type" text NOT NULL,
  "subject" text NOT NULL,
  "body_html" text NOT NULL,
  "body_text" text NOT NULL,
  "status" text NOT NULL DEFAULT 'pending',
  "sent_at" timestamp,
  "error_message" text,
  "retry_count" integer DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- API keys
CREATE TABLE IF NOT EXISTS "api_keys" (
  "id" text PRIMARY KEY NOT NULL,
  "key_hash" text NOT NULL UNIQUE,
  "key_prefix" text,
  "name" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "last_used_at" timestamp,
  "expires_at" timestamp,
  "is_active" boolean NOT NULL DEFAULT true,
  "rate_limit_rpm" integer NOT NULL DEFAULT 60,
  "rate_limit_tpd" integer NOT NULL DEFAULT 10000000,
  "allowed_models" text[] NOT NULL DEFAULT ARRAY['llama-3.3','llama-4','deepseek-v3','deepseek-v3.1','deepseek-r1','gpt-oss-120b','magpie'],
  "allowed_tools" text[] NOT NULL DEFAULT ARRAY['web_search','academic_search','youtube_search'],
  "metadata" jsonb NOT NULL DEFAULT '{}'
);

-- API usage
CREATE TABLE IF NOT EXISTS "api_usage" (
  "id" text PRIMARY KEY NOT NULL,
  "api_key_id" text NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
  "timestamp" timestamp NOT NULL DEFAULT now(),
  "model" text NOT NULL,
  "input_tokens" integer NOT NULL,
  "output_tokens" integer NOT NULL,
  "tool_calls" text[],
  "response_time_ms" integer,
  "status_code" integer NOT NULL,
  "error" text
);

-- User terms acceptance
CREATE TABLE IF NOT EXISTS "user_terms_acceptance" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "terms_version" varchar(20) NOT NULL DEFAULT '1.0',
  "accepted_at" timestamp NOT NULL DEFAULT now(),
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "user_terms_unique_idx" UNIQUE ("user_id", "terms_version")
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS "lookout_user_id_idx" ON "lookout"("user_id");
CREATE INDEX IF NOT EXISTS "user_file_user_id_idx" ON "user_file"("user_id");
CREATE INDEX IF NOT EXISTS "user_file_uploaded_at_idx" ON "user_file"("uploaded_at");
CREATE INDEX IF NOT EXISTS "user_file_rag_status_idx" ON "user_file"("rag_status");
CREATE INDEX IF NOT EXISTS "user_file_chat_id_idx" ON "user_file"("chat_id");
CREATE INDEX IF NOT EXISTS "file_chunk_file_id_idx" ON "file_chunk"("file_id");
CREATE INDEX IF NOT EXISTS "file_chunk_user_id_idx" ON "file_chunk"("user_id");
