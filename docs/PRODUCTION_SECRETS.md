# 🔐 Production Secrets Management

**Data**: 01/03/2026  
**Status**: ✅ Production Ready

---

## 1. Environment Variables Necessárias

### Backend (.env produção)

```bash
# ===== SERVIDOR =====
PORT=3001
NODE_ENV=production
APP_URL=https://seu-dominio.com

# ===== BANCO DE DADOS =====
DATABASE_URL=postgresql://user:STRONG_PASSWORD@postgres:5432/leidy_cleaner_prod
# SQLite only for development
DATABASE_LOCAL=./data/data.db

# ===== JWT - AUTENTICAÇÃO =====
JWT_SECRET=<GERAR_COM: openssl rand -hex 32>
JWT_REFRESH_SECRET=<GERAR_COM: openssl rand -hex 32>
JWT_EXPIRES_IN=24h

# ===== REDIS (Cache) =====
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=<GERAR_COM: openssl rand -hex 16>

# ===== EMAIL (SMTP) =====
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=<APP_PASSWORD_NAO_PASSWORD_NORMAL>
SMTP_FROM=nao-responda@leidycleaner.com

# ===== PAGAMENTO (Stripe) =====
STRIPE_SECRET_KEY=sk_live_XXXXXXXXXXXXXXXXXX (não sk_test_)
STRIPE_PUBLIC_KEY=pk_live_XXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXX

# ===== MONITORAMENTO (Sentry) =====
SENTRY_DSN=https://XXXXXXX@XXXXX.ingest.sentry.io/XXXXXX
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1

# ===== PIX/Webhoook =====
WEBHOOK_SECRET_PIX=<GERAR_COM: openssl rand -hex 32>

# ===== CORS =====
CORS_ORIGIN=https://seu-dominio.com
```

### Frontend (.env.local produção)

```bash
NEXT_PUBLIC_API_URL=https://seu-dominio.com/api/v1
NEXT_PUBLIC_STRIPE_KEY=pk_live_XXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=https://XXXXXXX@XXXXX.ingest.sentry.io/XXXXXX
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production
```

---

## 2. Gerar Chaves Seguras

### JWT Secrets
```bash
openssl rand -hex 32
# Output: a7f8c9e2b1d4a6f3c8e1b9d2a5f8c1e4b7a9d2e5f8a1c4d7e0f3a6b9c2d5e8
```

### Redis Password
```bash
openssl rand -hex 16
# Output: 3f2e1c4b9d6a8f5e2c7b1d4a9c6e3f8b
```

### Webhook Secret
```bash
openssl rand -hex 32
```

---

## 3. Configurar Stripe (Pagamentos)

### Test Mode (Desenvolvimento)
1. Criar conta em https://stripe.com
2. Ir em Settings → API Keys
3. Copiar `pk_test_` e `sk_test_`
4. Gerar webhook signing secret

### Live Mode (Produção)
1. Completar informações bancárias (Stripe)
2. Ativar modo "Live" em Settings
3. Copiar `pk_live_` e `sk_live_`
4. Registrar novo webhook (mesmo endpoint)
5. Atualizar `.env` com chaves live

**Webhook URL**: `https://seu-dominio.com/api/v1/payments/webhook`

---

## 4. Configurar Email (SMTP Gmail)

### Usar App Password (Recomendado)
1. Ativar 2FA na conta Google
2. Ir em https://myaccount.google.com/apppasswords
3. Selecionar "App: Mail" e "Device: Windows/Mac/Linux"
4. Copiar senha gerada (16 caracteres com espaços)
5. Remover espaços e usar no `.env`

**Não use a senha normal do Gmail!**

---

## 5. Configurar Sentry (Error Tracking)

### Setup
1. Criar conta em https://sentry.io
2. Criar novo projeto (Node.js)
3. Copiar DSN
4. Adicionar ao `.env` como `SENTRY_DSN`

### Integração Backend (já feita)
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
});
```

### Integração Frontend (já feita)
```typescript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
});
```

---

## 6. Armazenar Secrets Seguramente

### Opção 1: GitHub Secrets (CI/CD)
```bash
# No repositório, Settings → Secrets and variables → Actions
# Adicionar:
- JWT_SECRET
- JWT_REFRESH_SECRET
- REDIS_PASSWORD
- STRIPE_SECRET_KEY
- SENTRY_DSN
- DATABASE_URL
```

### Opção 2: Docker Secrets (Swarm)
```bash
echo "my_secret_value" | docker secret create jwt_secret -
```

### Opção 3: HashiCorp Vault (Enterprise)
```bash
vault kv put secret/leidy-cleaner/prod \
  JWT_SECRET=xxx \
  STRIPE_SECRET_KEY=xxx
```

### Opção 4: AWS Secrets Manager
```bash
aws secretsmanager create-secret \
  --name leidy-cleaner/prod \
  --secret-string '{"JWT_SECRET":"xxx"}'
```

---

## 7. Checklist de Produção

- [ ] Gerar todos JWT_SECRET e JWT_REFRESH_SECRET
- [ ] Configurar banco de dados PostgreSQL (não SQLite)
- [ ] Configurar SMTP (Gmail ou SendGrid)
- [ ] Configurar Stripe live keys
- [ ] Configurar Sentry DSN
- [ ] Gerar Redis password
- [ ] Gerar webhook secrets
- [ ] Atualizar nginx.prod.conf com domínio
- [ ] Gerar certificado SSL (Let's Encrypt)
- [ ] Testar backups (BD + arquivos)
- [ ] Configurar CI/CD secrets no GitHub
- [ ] Rodar migrations em staging
- [ ] Executar `npm audit` e corrigir vulnerabilidades de alta gravidade
- [ ] Testar pagamento com Stripe test card
- [ ] Rodar e2e tests em staging

---

## 8. Manutenção

### Rotacionar Secrets Mensalmente
```bash
# Gerar novo JWT_SECRET
openssl rand -hex 32

# Atualizar em .env, docker-compose, GitHub secrets
# Fazer deploy
# Monitorar logs para erros de auth
```

### Auditoria de Acesso
```bash
# Quem acessou .env?
git log -p -- .env

# Qual secret foi exposto?
git log --all --source --grep="secret\|password" --invert-grep
```

---

## 🚨 O QUE NUNCA FAZER

❌ Commitar `.env` com secrets em git
❌ Usar `sk_test_` em produção
❌ Compartilhar secrets via Slack/Email
❌ Usar mesma secret em dev/prod/staging
❌ Deixar secrets em código comentado
❌ Usar senhas do Google sem App Password
❌ Salvar logs com secrets (REDACTED_TOKEN automaticamente)

---

## 📋 Deploy Completo

```bash
# 1. Criar .env com todos secrets
cp .env.example .env.production
# Editar manualmente com valores reais

# 2. Compilar aplicação
docker-compose -f docker-compose.prod.yml build --no-cache

# 3. Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# 4. Rodar migrations
docker-compose -f docker-compose.prod.yml exec api npm run migrate

# 5. Seed inicial
docker-compose -f docker-compose.prod.yml exec api npm run seed

# 6. Health checks
curl https://seu-dominio.com/health
curl https://seu-dominio.com/api/v1/company

# 7. Monitorar logs
docker-compose -f docker-compose.prod.yml logs -f api
```
