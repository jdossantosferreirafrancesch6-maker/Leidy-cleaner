# 📋 Plano de Execução para Completar o Projeto

**Data**: 03/03/2026  
**Status**: Pronto para implementação  
**Tempo Estimado Total**: 4-6 horas

---

## 🎯 Objetivos Finais

1. ✅ Frontend completamente funcional (dev + prod)
2. ✅ Todos os .env files criados e configurados
3. ✅ E2E tests rodando e passando
4. ✅ Projeto deployável em produção
5. ✅ Documentação 100% completa

---

## 📊 Plano de Ação (Priorizado)

### **FASE 1: Configuração Base (30 min)**

#### 1.1 Criar .env Files
```bash
# ✅ Copiando templates
cp .env.example .env
cp backend/.env.example backend/.env
touch frontend/.env.local
```

**Valores padrão necessários:**
```env
# .env (root)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/leidy_cleaner_dev
REDIS_URL=redis://localhost:6379
NODE_ENV=development
API_URL=http://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
```

```env
# backend/.env
NODE_ENV=development
PORT=3001
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_NAME=leidy_cleaner_dev
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev_jwt_secret_change_me_in_production
JWT_REFRESH_SECRET=dev_refresh_secret_change_me
REDIS_HOST=localhost
REDIS_PORT=6379
STRIPE_SECRET_KEY=sk_test_fake_key_for_dev
STRIPE_PUBLIC_KEY=pk_test_fake_key_for_dev
SENTRY_DSN=https://fake@sentry.io/fake
GA4_API_KEY=
GA4_MEASUREMENT_ID=
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

```env
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001/api/v1
NEXT_PUBLIC_STRIPE_PUBLIC_KEY=pk_test_fake_key_for_dev
NEXT_PUBLIC_SENTRY_DSN=https://fake@sentry.io/fake
```

**Tempo**: 5 min

---

#### 1.2 Instalar Frontend Dependencies
```bash
cd frontend
npm install --legacy-peer-deps
cd ..
```

**Tempo**: 10 min (depende da internet)

---

#### 1.3 Build Frontend (Validação)
```bash
cd frontend
npm run build
# Se passar: ✅ Frontend pronto
# Se falhar: Debug e fix
```

**Tempo**: 15 min

---

### **FASE 2: Testes E2E (1 hora)**

#### 2.1 Executar Playwright Tests
```bash
cd backend
npm run e2e
# Validar: Authentication, Booking, Payment flows
```

**Tempo**: 30 min

---

#### 2.2 Fixtures para E2E
Se testes falharem, criar fixtures de dados:
```bash
cd backend
npx playwright test --debug  # Para depuração interativa
```

**Tempo**: 30 min

---

### **FASE 3: Validação Completa (1 hora)**

#### 3.1 Stack Dev Completa
```bash
# Terminal 1: Docker Compose
docker-compose -f docker-compose.dev.yml up

# Terminal 2: Verificar health
curl -s http://localhost/api/v1/auth/me -H "Authorization: Bearer VALID_TOKEN" | jq .

# Terminal 3: Testar Frontend
curl -s http://localhost:3000 | head -20
```

**Esperado:**
- ✅ Backend health: 200 OK
- ✅ Frontend loaded: HTML returned
- ✅ 5/5 containers healthy

**Tempo**: 20 min

---

#### 3.2 Testar Fluxo Completo (UI)
```bash
# Abrir browser
open http://localhost:3000

# Testes manuais:
1. Register novo usuário
2. Login
3. Criar booking
4. Ir ao checkout
5. Ver confirmação
```

**Tempo**: 20 min

---

#### 3.3 E2E Tests Automáticos
```bash
cd backend
npm run e2e:headed  # Para ver browser em ação
```

**Tempo**: 20 min

---

### **FASE 4: Documentação (1 hora)**

#### 4.1 API Documentation (Swagger)
```bash
# Backend já tem swagger-jsdoc configurado
# Acessar em: http://localhost:3001/api-docs

# Se não aparecer, verificar:
cd backend
grep -r "swagger\|openapi" src/
```

**Tempo**: 15 min

---

#### 4.2 README Completo
Adicionar ao README.md:
```markdown
# Leidy Cleaner

## Quick Start
\`\`\`bash
# Setup
cp .env.example .env
cp backend/.env.example backend/.env
cd frontend && npm install

# Run
docker-compose -f docker-compose.dev.yml up
open http://localhost:3000
\`\`\`

## Testes
\`\`\`bash
# Unit tests
npm test

# E2E tests
npm run e2e

# Coverage
npm run test:coverage
\`\`\`

## Deployment
Ver \`docs/DEPLOYMENT.md\`
```

**Tempo**: 20 min

---

#### 4.3 Deployment Guide
Criar `docs/DEPLOYMENT.md`:
```markdown
# Production Deployment

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Nginx with SSL

## Steps
1. Build images: \`docker build ...\`
2. Configure .env.prod
3. Run migrations
4. Setup SSL/TLS
5. Start services

## Monitoring
- Sentry for errors
- New Relic for APM
- CloudWatch/DataDog for logs
```

**Tempo**: 25 min

---

### **FASE 5: Production Ready (1-2 horas)**

#### 5.1 Security Audit (30 min)
```bash
# Verificar secrets
grep -r "dev_secret\|pk_test\|sk_test\|fake" backend/.env backend/src/

# Resultado esperado:
# ❌ 0 secrets encontrados (tudo em .env)

# Verificar dependências vulneráveis
npm audit
npm audit fix --legacy-peer-deps
```

---

#### 5.2 SSL/TLS Setup (30 min)
```bash
# Generate self-signed cert (dev)
openssl req -x509 -newkey rsa:4096 -nodes \
  -out cert.pem -keyout key.pem -days 365

# Setup nginx.prod.conf com SSL
# Copiar certs para volume seguro
```

---

#### 5.3 Docker Compose Prod (30 min)
```bash
# Criar docker-compose.prod.yml
# Configurar variáveis de prod
# Testar localmente:
docker-compose -f docker-compose.prod.yml up

# Validar:
curl -s https://localhost/api/v1/auth/me
```

---

### **FASE 6: Git & CI/CD (30 min)**

#### 6.1 Git Commit & Push
```bash
git add .
git commit -m "feat: Complete project setup with E2E tests, docs, and prod config"
git push origin main
```

---

#### 6.2 Verificar CI/CD Pipeline
```bash
# No GitHub: Actions tab
# Verificar se todos os workflows passam:
- ✅ ci-cd.yml (build + test)
- ✅ e2e.yml (playwright tests)
- ✅ lint-test.yml (eslint + prettier)
- ✅ publish-docker.yml (push images)
```

---

## 📈 Checklist de Execução

### Fase 1: Configuração Base
- [ ] .env (root) criado
- [ ] backend/.env criado
- [ ] frontend/.env.local criado
- [ ] Frontend npm install completo
- [ ] Frontend npm run build passing

### Fase 2: E2E Tests
- [ ] Playwright tests rodando
- [ ] Auth test passing
- [ ] Booking test passing
- [ ] Payment test passing

### Fase 3: Validação
- [ ] Docker stack up (5/5 containers)
- [ ] Backend health check OK
- [ ] Frontend loads OK
- [ ] Fluxo UI manual OK (register → booking → pay)
- [ ] E2E tests headless OK

### Fase 4: Documentação
- [ ] API docs (Swagger) OK
- [ ] README.md completo
- [ ] DEPLOYMENT.md criado
- [ ] API endpoints documentados

### Fase 5: Production Ready
- [ ] Security audit OK (0 secrets hard-coded)
- [ ] Dependencies audit OK
- [ ] SSL certs gerados
- [ ] docker-compose.prod.yml criado
- [ ] Prod stack tested

### Fase 6: Git & CI/CD
- [ ] Código commitado
- [ ] GitHub CI/CD pipeline verde
- [ ] Docker images published
- [ ] Pronto para deploy

---

## 🎁 Resultado Final

Ao completar este plano você terá:

```
✅ Projeto 100% funcional em dev + prod
✅ Frontend + Backend integrados
✅ Tests automatizados (unit + E2E)
✅ Documentação completa (API + Deployment)
✅ CI/CD pipeline verde
✅ Pronto para production
✅ Secrets seguros
✅ SSL/TLS configurado
✅ Monitoramento (Sentry) ativo
```

---

## ⚡ Começar Agora?

### Opção 1: Rápido (30 min - Core Only)
```bash
# Apenas o essencial
cp .env.example .env
cp backend/.env.example backend/.env
cd frontend && npm install
npm run build
echo "✅ Pronto para rodar"
```

### Opção 2: Completo (4-6 horas - Production Ready)
Seguir todas as 6 fases do plano acima.

---

**Próximo passo**: Quer que eu implemente o quê primeiro?
- [ ] Criar .env files?
- [ ] Instalar frontend deps?
- [ ] Rodar E2E tests?
- [ ] Tudo acima?
