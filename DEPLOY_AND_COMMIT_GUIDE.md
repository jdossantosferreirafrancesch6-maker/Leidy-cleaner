# 🎬 Instruções Finais - Commit & Deploy

## ✅ Verificações Pré-Commit

### 1. Limpar e Validar

```bash
# Puxar versão mais recente
git fetch origin

# Verificar status
git status

# Ver mudanças
git diff --name-only

# Limpar build artifacts
npm run clean
docker-compose -f docker-compose.prod.yml down -v
```

### 2. Testes Finais

```bash
# Backend tests
cd backend
npm run test:unit
npm run test:integration
cd ..

# Frontend tests (opcional)
cd frontend
npm run test --passWithNoTests
cd ..

# Build check
docker-compose -f docker-compose.prod.yml build --no-cache
```

### 3. Validação de Segurança

```bash
# Verificar commits acidentais de .env
git diff --cached | grep -i "password\|secret\|key" && echo "❌ SEGREDO DETECTADO!" || echo "✅ Seguro"

# Verificar .env.production não foi commitado
git ls-files | grep ".env" && echo "❌ ALERT!" || echo "✅ OK"

# Validar .gitignore
cat .gitignore | grep -E "\.env|secrets|node_modules"
```

---

## 📝 Criar Commits

### Estrutura de Mensagem

```
[TIPO]: Descrição breve

Descrição detalhada:
- O que foi implementado
- Por quê
- Como afeta o projeto

Pode incluir:
- Número de issue (#123)
- Breaking changes
- Performance impact
```

### Tipos de Commit

```
✨ feat:       Nova funcionalidade
🐛 fix:        Correção de bug
📝 docs:       Mudança em documentação
🎨 style:      Formatação, sem lógica
♻️  refactor:   Refactoring sem mudança de função
⚡ perf:       Melhoria de performance
✅ test:       Adicionar ou corrigir testes
🔧 chore:      Dependências, build tools
🚀 deploy:     Deployment/produção setup
🔐 security:   Mudanças de segurança
```

---

## 🔄 Commits para Fazer

### Commit 1: Email Service

```bash
git add backend/src/services/EmailService.ts
git commit -m "✨ feat: Add complete EmailService with transactional emails

- Implemented welcome, booking confirmation, payment receipt emails
- Add review reminders and password reset emails
- Integrated Nodemailer with Gmail/SMTP support
- All email templates with Leidy Cleaner branding
- Support for HTML emails with inline CSS"
```

### Commit 2: Staff Services Expansion

```bash
git add backend/src/services/StaffService.ts
git commit -m "✨ feat: Expand StaffService with dashboard and stats

- Add staff dashboard with today + upcoming bookings
- Implement booking management (assign, update status)
- Add performance statistics (ratings, completion rate)
- Add special dates (vacations, sick leave)
- Add trending staff query by ratings" 
```

### Commit 3: Geolocation Services

```bash
git add backend/src/services/GeolocationService.ts
git commit -m "✨ feat: Add Mapbox geolocation integration

- Implement address autocomplete with Mapbox API
- Add geocoding (address to coordinates) and reverse geocoding
- Implement distance calculation (Haversine formula)
- Add travel time estimation
- Validate service area and suggest nearby staff
- Support CPF/CNPJ validation for PIX keys"
```

### Commit 4: 2FA Enhancement

```bash
git add backend/src/services/TwoFactorService.ts
git commit -m "✨ feat: Expand TwoFactorService with backup codes and status

- Add backup codes generation and validation
- Implement regenerate backup codes
- Add 2FA status checking
- Make 2FA mandatory for admin/manager roles
- Add last_used tracking for 2FA tokens"
```

### Commit 5: Analytics Integration

```bash
git add backend/src/services/AnalyticsService.ts
git commit -m "✨ feat: Add Google Analytics 4 integration

- Implement event tracking for all user actions
- Add conversion tracking for purchases
- Track user funnel (signup > browse > book > pay)
- Add custom event batching
- Support for goal tracking and attribution"
```

### Commit 6: PIX Enhancement

```bash
git add backend/src/services/PIXService.ts
git commit -m "✨ feat: Expand PIX service with full payment lifecycle

- Add dynamic PIX QR code generation
- Implement webhook validation and processing
- Add transaction status verification
- Implement PIX refunds
- Add transaction history and statistics"
```

### Commit 7: Review Service

```bash
git add backend/src/services/ReviewService.ts
git commit -m "✨ feat: Add complete ReviewService with moderation

- Implement review creation with categories and photos
- Add review moderation (approve/reject)
- Add review flagging for inappropriate content
- Implement staff replies to reviews
- Add trending staff by ratings
- Auto-update staff rating on new review"
```

### Commit 8: Backup & Restore Script

```bash
git add scripts/backup-restore.sh
git commit -m "🔧 chore: Add database backup and restore script

Features:
- Full and incremental backups
- Automatic retention policy
- SHA256 checksum verification
- Restore with point-in-time recovery
- Backup statistics and listing
- Cron integration for scheduled backups"
```

### Commit 9: Documentation & Guides

```bash
git add PRODUCTION_DEPLOYMENT_GUIDE.md QA_TESTING_CHECKLIST.md IMPLEMENTATION_SUMMARY.md
git commit -m "📝 docs: Add comprehensive production guides and checklists

Added:
- PRODUCTION_DEPLOYMENT_GUIDE.md (complete deployment steps)
- QA_TESTING_CHECKLIST.md (95+ test items)
- IMPLEMENTATION_SUMMARY.md (feature overview)

Includes SSL setup, backup strategies, monitoring, and troubleshooting"
```

### Commit 10: Controller Examples

```bash
git add backend/src/controllers/EXAMPLE_USAGE_CONTROLLERS.ts
git commit -m "📝 docs: Add service integration examples

Included controller examples for:
- Booking with email notifications
- Staff dashboard and availability
- 2FA enable/verify/disable
- Reviews and moderation
- Geolocation queries
- Analytics tracking"
```

### Commit 11: Socket.IO Integration

```bash
git add backend/src/socket/SOCKETIO_INTEGRATION_GUIDE.ts
git commit -m "📝 docs: Add Socket.IO real-time chat integration guide

Includes:
- Backend Socket.IO setup and events
- Message handling and notifications
- Typing indicators
- React hooks for Socket.IO
- ChatWindow component implementation"
```

### Commit 12: Environment Variables

```bash
git add .env.production
git commit -m "🔧 chore: Update production environment template

Added configurations for:
- Mapbox geolocation
- 2FA settings
- Google Analytics 4  
- Sentry error tracking
- PIX webhook secrets"
```

---

## 🚀 Push para GitHub

### 1. Configurar Remote (primeira vez)

```bash
git remote add origin https://github.com/seu-usuario/leidy-cleaner.git
# ou
git remote set-url origin https://github.com/seu-usuario/leidy-cleaner.git
```

### 2. Verificar Branch

```bash
git branch -a
git checkout -b production  # Se não existir
```

### 3. Push com Force (se necessário)

```bash
# Comum (seguro)
git push origin production

# Force (CUIDADO - sobrescreve)
git push origin production --force-with-lease
```

### 4. Criar Pull Request (se usando)

```bash
# GitHub CLI
gh pr create --title "chore: Production ready implementation" \
  --body "Implements all remaining services and documentation"

# Ou via interface web
# https://github.com/seu-usuario/leidy-cleaner/pulls
```

---

## 📦 Docker Push (Hub, ECR, etc)

### Docker Hub

```bash
# Login
docker login

# Tag images
docker tag leidy-cleaner-backend seu-usuario/leidy-cleaner:backend-latest
docker tag leidy-cleaner-frontend seu-usuario/leidy-cleaner:frontend-latest

# Push
docker push seu-usuario/leidy-cleaner:backend-latest
docker push seu-usuario/leidy-cleaner:frontend-latest
```

### AWS ECR

```bash
# Login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

# Tag
docker tag leidy-cleaner-backend:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/leidy-cleaner:latest

# Push
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/leidy-cleaner:latest
```

---

## 🎯 GitHub Actions / CI/CD

### Workflow para Deploy Automático

```yaml
# .github/workflows/deploy-prod.yml (já foi gerado)

name: Deploy Production

on:
  push:
    branches: [main, production]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Test Backend
        run: cd backend && npm ci && npm run test
      
      - name: Test Frontend
        run: cd frontend && npm ci && npm run test
      
      - name: Build Docker Images
        run: docker-compose -f docker-compose.prod.yml build
      
      - name: Deploy to Production
        env:
          DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
          DEPLOY_HOST: ${{ secrets.DEPLOY_HOST }}
        run: ./deploy-final.sh
```

---

## ✅ Checklist Pré-Deploy

- [ ] Todos os testes passam
- [ ] `.env.production` não foi commitado
- [ ] `docker-compose logs` não mostra erros
- [ ] Health check responde (`/health`)
- [ ] HTTPS funciona (`https://seu-dominio.com`)
- [ ] Emails estão sendo enviados
- [ ] Stripe/PIX webhooks configurados
- [ ] Backups estão sendo feitos
- [ ] Analytics rastreando eventos
- [ ] Database migrations rodam com sucesso
- [ ] Admin user foi criado
- [ ] SSL certificado válido (30+ dias)

---

## 🔍 Verificação Pós-Deploy

### 1. Health Checks

```bash
# API
curl -s https://api.seu-dominio.com/health | jq .

# Frontend
curl -s https://seu-dominio.com | grep "Leidy Cleaner"

# Database
curl -s https://api.seu-dominio.com/api/v1/admin/health/db

# Cache
curl -s https://api.seu-dominio.com/api/v1/admin/health/redis
```

### 2. Logs

```bash
# SSH no servidor
ssh user@seu-ip-servidor

# Ver logs do container
docker logs -f avan-backend

# Ver logs do nginx
tail -f /var/log/nginx/leidy-cleaner.access.log
```

### 3. Testes Funcionais

```bash
# Teste de registro
curl -X POST https://api.seu-dominio.com/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Senha123!","name":"Test User"}'

# Teste de serviços
curl https://api.seu-dominio.com/api/v1/services

# Teste de admin health
curl https://api.seu-dominio.com/api/v1/admin/health
```

---

## 🚨 Rollback (se necessário)

```bash
# SSH no servidor
ssh user@seu-ip-servidor
cd /opt/leidy-cleaner

# Ver última versão conhecida boa
git log --oneline -10

# Reverter para commit anterior
git reset --hard <commit-hash>

# Rebuild e restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verificar
docker logs -f avan-backend
```

---

## 📊 Monitoramento Contínuo

```bash
# CPU e Memory
docker stats avan-backend avan-frontend avan-postgres

# Eventos Docker
docker events --filter type=container

# Network
docker network inspect leidy-cleaner_default

# Volumes
docker volume ls | grep leidy
```

---

## 📧 Notificação de Sucesso

Após deploy bem-sucedido:

```bash
# Enviar email para stakeholders
cat << EOF | mail -s "✅ Leidy Cleaner Deploy Bem-Sucedido" seu-email@seu-email.com
Sistema deployado com sucesso!

Novo services implementados:
✅ Email transacional (Nodemailer/Gmail)
✅ Staff dashboard com stats
✅ 2FA (TOTP + Backup codes)
✅ Geolocalização (Mapbox)
✅ Analytics (Google Analytics 4)
✅ PIX full integration
✅ Reviews com moderação
✅ Chat real-time (Socket.IO)
✅ Backup automático

Status:
- 🟢 Frontend: https://seu-dominio.com
- 🟢 Backend: https://api.seu-dominio.com
- 🟢 Health check: ✅ Passing

Deploy realizado em: $(date)
EOF
```

---

## 🎉 Parabéns!

Sistema completamente implementado e em produção! 🚀

**Próximas melhorias:**
- Mobile app (React Native)
- Testes E2E (Playwright)
- Advanced analytics
- Multi-language support
- PWA offline mode

---

**Obrigado por usar Leidy Cleaner!**  
*Limpeza Profissional em suas mãos*

**Desenvolvido com ❤️ - 2026**
