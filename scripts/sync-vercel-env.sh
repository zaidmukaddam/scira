#!/bin/bash

# Script para sincronizar variáveis de ambiente do .env.local para Vercel
# Usage: ./scripts/sync-vercel-env.sh

set -e

echo "🔄 Sincronizando variáveis de ambiente para Vercel..."
echo ""

# Load .env.local
if [ ! -f .env.local ]; then
  echo "❌ Erro: .env.local não encontrado"
  exit 1
fi

# Function to add env var to Vercel
add_env_var() {
  local key=$1
  local value=$2

  if [ -z "$value" ] || [ "$value" = "placeholder" ] || [[ "$value" == placeholder_* ]]; then
    echo "⏭️  Pulando $key (valor placeholder ou vazio)"
    return
  fi

  echo "➕ Adicionando $key..."
  echo "$value" | vercel env add "$key" production --yes 2>/dev/null || echo "   ℹ️  $key já existe ou erro ao adicionar"
}

echo "=== VARIÁVEIS CRÍTICAS ==="
echo ""

# BETTER_AUTH_URL - CRÍTICO
BETTER_AUTH_URL="https://scira-repo.vercel.app"
echo "➕ Adicionando BETTER_AUTH_URL..."
echo "$BETTER_AUTH_URL" | vercel env add BETTER_AUTH_URL production --yes 2>/dev/null || echo "   ℹ️  Já existe"

# Extrair variáveis do .env.local
source .env.local

# BLOB_READ_WRITE_TOKEN - CRÍTICO
add_env_var "BLOB_READ_WRITE_TOKEN" "$BLOB_READ_WRITE_TOKEN"

echo ""
echo "=== VARIÁVEIS IMPORTANTES DE API ==="
echo ""

# AI Provider APIs
add_env_var "GROQ_API_KEY" "$GROQ_API_KEY"
add_env_var "GOOGLE_GENERATIVE_AI_API_KEY" "$GOOGLE_GENERATIVE_AI_API_KEY"

# Search APIs
add_env_var "EXA_API_KEY" "$EXA_API_KEY"
add_env_var "FIRECRAWL_API_KEY" "$FIRECRAWL_API_KEY"

# Communication
add_env_var "RESEND_API_KEY" "$RESEND_API_KEY"

# Other APIs
add_env_var "RAPID_API_KEY" "$RAPID_API_KEY"
add_env_var "QSTASH_TOKEN" "$QSTASH_TOKEN"

echo ""
echo "=== VARIÁVEIS DE OAUTH ==="
echo ""

add_env_var "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
add_env_var "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
add_env_var "TWITTER_CLIENT_ID" "$TWITTER_CLIENT_ID"
add_env_var "TWITTER_CLIENT_SECRET" "$TWITTER_CLIENT_SECRET"

echo ""
echo "=== VARIÁVEIS PÚBLICAS (NEXT_PUBLIC_*) ==="
echo ""

# Public env vars
add_env_var "NEXT_PUBLIC_MAPBOX_TOKEN" "$NEXT_PUBLIC_MAPBOX_TOKEN"
add_env_var "NEXT_PUBLIC_POSTHOG_KEY" "$NEXT_PUBLIC_POSTHOG_KEY"
add_env_var "NEXT_PUBLIC_POSTHOG_HOST" "$NEXT_PUBLIC_POSTHOG_HOST"
add_env_var "NEXT_PUBLIC_PREMIUM_TIER" "$NEXT_PUBLIC_PREMIUM_TIER"
add_env_var "NEXT_PUBLIC_PREMIUM_SLUG" "$NEXT_PUBLIC_PREMIUM_SLUG"
add_env_var "NEXT_PUBLIC_STARTER_TIER" "$NEXT_PUBLIC_STARTER_TIER"
add_env_var "NEXT_PUBLIC_STARTER_SLUG" "$NEXT_PUBLIC_STARTER_SLUG"

echo ""
echo "=== VARIÁVEIS OPCIONAIS ==="
echo ""

# Optional but useful
add_env_var "REDIS_URL" "$REDIS_URL"
add_env_var "UPSTASH_REDIS_REST_URL" "$UPSTASH_REDIS_REST_URL"
add_env_var "UPSTASH_REDIS_REST_TOKEN" "$UPSTASH_REDIS_REST_TOKEN"
add_env_var "SUPERMEMORY_API_KEY" "$SUPERMEMORY_API_KEY"
add_env_var "SMITHERY_API_KEY" "$SMITHERY_API_KEY"
add_env_var "DAYTONA_API_KEY" "$DAYTONA_API_KEY"

# Maps & Location
add_env_var "GOOGLE_MAPS_API_KEY" "$GOOGLE_MAPS_API_KEY"
add_env_var "MAPBOX_ACCESS_TOKEN" "$MAPBOX_ACCESS_TOKEN"

# Media & Entertainment
add_env_var "TMDB_API_KEY" "$TMDB_API_KEY"
add_env_var "YT_ENDPOINT" "$YT_ENDPOINT"
add_env_var "ELEVENLABS_API_KEY" "$ELEVENLABS_API_KEY"

# Weather & Aviation
add_env_var "OPENWEATHER_API_KEY" "$OPENWEATHER_API_KEY"
add_env_var "AVIATION_STACK_API_KEY" "$AVIATION_STACK_API_KEY"

# Finance
add_env_var "COINGECKO_API_KEY" "$COINGECKO_API_KEY"
add_env_var "VALYU_API_KEY" "$VALYU_API_KEY"

# Other services
add_env_var "TRIPADVISOR_API_KEY" "$TRIPADVISOR_API_KEY"
add_env_var "PARALLEL_API_KEY" "$PARALLEL_API_KEY"
add_env_var "AMADEUS_API_KEY" "$AMADEUS_API_KEY"
add_env_var "AMADEUS_API_SECRET" "$AMADEUS_API_SECRET"

# Cron & Security
add_env_var "CRON_SECRET" "$CRON_SECRET"

# Payments (comentados mas inclusos caso você queira reativar)
add_env_var "DODO_PAYMENTS_API_KEY" "$DODO_PAYMENTS_API_KEY"
add_env_var "POLAR_WEBHOOK_SECRET" "$POLAR_WEBHOOK_SECRET"

echo ""
echo "✅ Sincronização concluída!"
echo ""
echo "📝 Próximos passos:"
echo "1. Verifique as variáveis adicionadas: vercel env ls"
echo "2. Faça um novo deploy: vercel --prod"
echo "3. Teste as funcionalidades no site"
echo ""
