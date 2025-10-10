-- 01-extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 02-table credentials locale (si non existante)
CREATE TABLE IF NOT EXISTS users (
  username       TEXT PRIMARY KEY,
  password_hash  TEXT NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  role           TEXT NOT NULL DEFAULT 'user',
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 03-compte admin "sam" avec mot de passe bcrypt "sam" (min 3)
-- NB: le backend acceptera argon2 ET bcrypt; ce seed utilise bcrypt via pgcrypto
INSERT INTO users (username, password_hash, role)
VALUES (
  'sam',
  crypt('sam', gen_salt('bf', 12)),
  'admin'
)
ON CONFLICT (username) DO NOTHING;

-- 04-enregistrement dans la table applicative "user" (si nécessaire)
-- Cette table provient de l’ancien schéma Better Auth, avec email NOT NULL.
-- On crée un enregistrement compatible pour préserver le comportement post-login.
INSERT INTO "user" (id, name, email, email_verified, image, created_at, updated_at)
VALUES (
  'local:sam',
  'sam',
  'sam@local',
  FALSE,
  NULL,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO NOTHING;
