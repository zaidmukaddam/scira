-- Critical Performance Indexes for scira
-- Using correct database column names from schema

-- 1. MESSAGE USAGE - Most critical (user_id + date range queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_usage_user_date
ON message_usage(user_id, date);

-- 2. EXTREME SEARCH USAGE - Critical (user_id + date range queries)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extreme_search_usage_user_date
ON extreme_search_usage(user_id, date);

-- 3. SUBSCRIPTION - Critical (userId lookups for Pro checks)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subscription_user_id
ON subscription("userId");

-- 4. USER EMAIL - Critical (auth session lookups)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_email
ON "user"(email);

-- 5. CHAT USER QUERIES - Important (chat history)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_user_created
ON chat("userId", created_at DESC);

-- 6. MESSAGE CHAT QUERIES - Important (message loading)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_chat_created
ON message(chat_id, created_at ASC);

-- 7. SESSION TOKEN - Auth performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token
ON session(token);

-- 8. SESSION USER - Auth performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_user_id
ON session(user_id);

-- 9. SESSION TOKEN LOOKUP - Critical for auth performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_token_expires
ON session(token, expires_at);

-- 10. SESSION ACTIVE LOOKUP - Fast active session checks
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_active
ON session(token, expires_at, user_id);

-- 11. USER ID LOOKUP - Speed up user table access
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_id
ON "user"(id);

-- 12. MESSAGE USAGE TODAY - Optimize daily usage lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_message_usage_today
ON message_usage(user_id, date DESC, message_count);

-- 13. EXTREME SEARCH USAGE MONTH - Optimize monthly usage lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_extreme_usage_month
ON extreme_search_usage(user_id, date DESC, search_count);

-- Optional: Clean up old usage data to improve performance
-- DELETE FROM message_usage WHERE date < NOW() - INTERVAL '7 days';
-- DELETE FROM extreme_search_usage WHERE date < NOW() - INTERVAL '3 months';
