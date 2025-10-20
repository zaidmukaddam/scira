-- Migration: Create user_agent_access table
-- Description: Table pour gérer les accès aux agents par utilisateur

CREATE TABLE IF NOT EXISTS "user_agent_access" (
  "id" text PRIMARY KEY,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "agent_id" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

-- Index composite pour requêtes rapides
CREATE UNIQUE INDEX IF NOT EXISTS "user_agent_access_user_agent_idx"
ON "user_agent_access" ("user_id", "agent_id");

-- Créer accès par défaut pour tous les utilisateurs existants (tous agents activés)
INSERT INTO "user_agent_access" ("id", "user_id", "agent_id", "enabled")
SELECT
  'access_' || u.id || '_' || a.agent_id,
  u.id,
  a.agent_id,
  true
FROM "user" u
CROSS JOIN (
  SELECT unnest(ARRAY[
    'web','x','academic','youtube','reddit','stocks','chat','extreme','memory',
    'crypto','code','connectors','cyrus','libeller','nomenclature','pdfExcel'
  ]) AS agent_id
) a
WHERE u.status = 'active'
ON CONFLICT DO NOTHING;
