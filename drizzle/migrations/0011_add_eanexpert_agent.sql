-- Add eanexpert agent to all existing users
INSERT INTO "user_agent_access" ("id", "user_id", "agent_id", "enabled", "created_at", "updated_at")
SELECT
  'access_' || u.id || '_eanexpert',
  u.id,
  'eanexpert',
  true,
  NOW(),
  NOW()
FROM "user" u
WHERE u.status = 'active'
ON CONFLICT DO NOTHING;
