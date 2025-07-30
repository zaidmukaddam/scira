CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_usage_user_date
ON message_usage(user_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extreme_search_usage_user_date
ON extreme_search_usage(user_id, date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_user_id
ON subscription("userId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email
ON "user"(email);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_user_created
ON chat("userId", created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_chat_created
ON message(chat_id, created_at ASC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token
ON session(token);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_id
ON session(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token_expires
ON session(token, expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_active
ON session(token, expires_at, user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_id
ON "user"(id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_usage_today
ON message_usage(user_id, date DESC, message_count);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extreme_usage_month
ON extreme_search_usage(user_id, date DESC, search_count);

