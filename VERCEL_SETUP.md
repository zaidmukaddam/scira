# Configuração de URLs para Deploy na Vercel

## Variáveis de Ambiente Obrigatórias na Vercel

Para que o seu deploy na Vercel funcione corretamente, você precisa configurar estas variáveis de ambiente no **Vercel Dashboard**:

### 1. Acesse o Vercel Dashboard
- Vá para: https://vercel.com/dashboard
- Selecione seu projeto: `scira-repo`
- Clique em **Settings** → **Environment Variables**

### 2. Configure estas Variáveis

#### URLs da Aplicação
```bash
NEXT_PUBLIC_APP_URL=https://scira-repo.vercel.app
BETTER_AUTH_URL=https://scira-repo.vercel.app
```

#### Outras Variáveis Importantes
Copie todas as variáveis do seu `.env.local` que não são `placeholder`, incluindo:

- `XAI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `GROQ_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `TAVILY_API_KEY`
- `EXA_API_KEY`
- `FIRECRAWL_API_KEY`
- E todas as outras que você configurou com valores reais

### 3. Atualizar OAuth Callbacks

#### GitHub OAuth
1. Acesse: https://github.com/settings/developers
2. Encontre sua aplicação OAuth
3. Adicione esta URL de callback:
   ```
   https://scira-repo.vercel.app/api/auth/callback/github
   ```

#### Google OAuth (se configurado)
1. Acesse: https://console.cloud.google.com/apis/credentials
2. Edite seu OAuth 2.0 Client
3. Adicione estas URLs:
   - **Authorized JavaScript origins:** `https://scira-repo.vercel.app`
   - **Authorized redirect URIs:** `https://scira-repo.vercel.app/api/auth/callback/google`

#### Twitter OAuth (se configurado)
1. Acesse: https://developer.twitter.com/en/portal/dashboard
2. Edite sua aplicação
3. Adicione: `https://scira-repo.vercel.app/api/auth/callback/twitter`

## Arquivos Modificados

### 1. `.env.local`
- Adicionados comentários explicando que as URLs devem ser configuradas na Vercel
- Mantém `localhost:8931` para desenvolvimento local

### 2. `lib/auth.ts`
- Linha 77: Agora usa `process.env.BETTER_AUTH_URL` com fallback inteligente
- Linhas 474-475: Adicionada `https://scira-repo.vercel.app` nas listas de origens permitidas

### 3. `lib/auth-client.ts`
- ✅ Já estava correto - usa `NEXT_PUBLIC_APP_URL` com fallback

### 4. `lib/connectors.tsx`
- Função `getBaseUrl()` agora usa `NEXT_PUBLIC_APP_URL` como prioridade
- Fallback correto para `localhost:8931` em dev
- Fallback de produção: `https://scira-repo.vercel.app`

### 5. `app/search/[id]/page.tsx`
- Adicionada função `getBaseUrl()` para metadata dinâmico
- OpenGraph e Twitter Card URLs agora são dinâmicas
- Funciona corretamente tanto em dev quanto em produção

## Como Funciona

### Desenvolvimento Local
```bash
# .env.local
NEXT_PUBLIC_APP_URL=http://localhost:8931
BETTER_AUTH_URL=http://localhost:8931
```

### Produção (Vercel)
```bash
# Vercel Environment Variables
NEXT_PUBLIC_APP_URL=https://scira-repo.vercel.app
BETTER_AUTH_URL=https://scira-repo.vercel.app
```

## Verificação Após Deploy

### 1. Testar Autenticação
- Acesse: `https://scira-repo.vercel.app`
- Clique em "Sign In"
- Tente fazer login com GitHub
- **Verifique no DevTools Console** se não há erros

### 2. Testar URLs de Compartilhamento
- Faça uma busca
- Copie a URL (ex: `https://scira-repo.vercel.app/search/abc123...`)
- Abra em aba anônima
- Verifique se carrega corretamente

### 3. Testar Metadata (OpenGraph)
- Use: https://www.opengraph.xyz/
- Cole a URL de uma busca
- Verifique se as imagens e títulos aparecem corretamente

## Troubleshooting

### Erro: "OAuth callback mismatch"
**Solução:** Verifique se adicionou a URL de callback correta no GitHub/Google/Twitter

### Erro: "CORS policy"
**Solução:** Verifique se `BETTER_AUTH_URL` está configurada corretamente na Vercel

### Erro: "Invalid redirect"
**Solução:** Certifique-se que `NEXT_PUBLIC_APP_URL` está configurada na Vercel

### Metadata não aparece
**Solução:** Limpe o cache do OpenGraph e aguarde alguns minutos

## Domínio Customizado (Opcional)

Se você quiser usar um domínio customizado (ex: `meu-scira.com`):

1. Configure o domínio na Vercel
2. Atualize as variáveis de ambiente:
   ```bash
   NEXT_PUBLIC_APP_URL=https://meu-scira.com
   BETTER_AUTH_URL=https://meu-scira.com
   ```
3. Atualize os callbacks OAuth com o novo domínio
4. Adicione o novo domínio em `lib/auth.ts` nas listas de origens permitidas

## Checklist Final

- [ ] Configurei `NEXT_PUBLIC_APP_URL` na Vercel
- [ ] Configurei `BETTER_AUTH_URL` na Vercel
- [ ] Copiei todas as API keys do `.env.local` para Vercel
- [ ] Atualizei os OAuth callbacks no GitHub
- [ ] Atualizei os OAuth callbacks no Google (se aplicável)
- [ ] Testei o login no site em produção
- [ ] Verifiquei o DevTools Console para erros
- [ ] Testei compartilhar uma busca
- [ ] Metadata do OpenGraph funciona corretamente

---

**Data de criação:** 2025-11-10
**Domínio de produção:** https://scira-repo.vercel.app
