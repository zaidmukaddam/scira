#!/bin/bash

# Script para adicionar variáveis críticas faltando na Vercel
set -e

echo "🔄 Adicionando variáveis críticas faltando na Vercel..."
echo ""

# Extract values from .env.local using grep
GROQ_KEY=$(grep "^GROQ_API_KEY=" .env.local | cut -d= -f2)
GOOGLE_AI_KEY=$(grep "^GOOGLE_GENERATIVE_AI_API_KEY=" .env.local | cut -d= -f2)
BLOB_TOKEN=$(grep "^BLOB_READ_WRITE_TOKEN=" .env.local | cut -d= -f2)
EXA_KEY=$(grep "^EXA_API_KEY=" .env.local | cut -d= -f2)
FIRECRAWL_KEY=$(grep "^FIRECRAWL_API_KEY=" .env.local | cut -d= -f2)
RESEND_KEY=$(grep "^RESEND_API_KEY=" .env.local | cut -d= -f2)
RAPID_KEY=$(grep "^RAPID_API_KEY=" .env.local | cut -d= -f2)

echo "📌 Variável 1/8: BETTER_AUTH_URL"
echo "https://scira-repo.vercel.app" | vercel env add BETTER_AUTH_URL production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 2/8: GROQ_API_KEY"
echo "$GROQ_KEY" | vercel env add GROQ_API_KEY production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 3/8: GOOGLE_GENERATIVE_AI_API_KEY"
echo "$GOOGLE_AI_KEY" | vercel env add GOOGLE_GENERATIVE_AI_API_KEY production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 4/8: BLOB_READ_WRITE_TOKEN"
echo "$BLOB_TOKEN" | vercel env add BLOB_READ_WRITE_TOKEN production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 5/8: EXA_API_KEY"
echo "$EXA_KEY" | vercel env add EXA_API_KEY production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 6/8: FIRECRAWL_API_KEY"
echo "$FIRECRAWL_KEY" | vercel env add FIRECRAWL_API_KEY production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 7/8: RESEND_API_KEY"
echo "$RESEND_KEY" | vercel env add RESEND_API_KEY production 2>&1 | grep -v "WARN" || true

echo "📌 Variável 8/8: RAPID_API_KEY"
echo "$RAPID_KEY" | vercel env add RAPID_API_KEY production 2>&1 | grep -v "WARN" || true

echo ""
echo "✅ Concluído!"
echo ""
echo "Verificando variáveis adicionadas..."
vercel env ls production 2>&1 | grep -E "^\ " | wc -l | xargs echo "Total de variáveis:"
