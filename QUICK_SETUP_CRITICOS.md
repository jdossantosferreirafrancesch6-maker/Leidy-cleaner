# ⚡ QUICK SETUP - Críticos Implementados

## 🚀 Em 5 Minutos

```bash
cd /workspaces/Leidy-cleaner

# 1. Copiar .env
cp backend/.env.example .env

# 2. Editar variáveis críticas
nano .env
# Preencher:
# - JWT_SECRET: openssl rand -hex 32
# - STRIPE_SECRET_KEY: sk_live_xxx
# - SENTRY_DSN: https://xxx@xxx.ingest.sentry.io/xxx
# - SMTP_PASS: seu app password do Gmail

# 3. Setup SSL
./setup-ssl.sh

# 4. Setup Backup Automático
chmod +x scripts/backup-production.sh scripts/setup-backup-cron.sh
./scripts/setup-backup-cron.sh

# 5. Deploy com Nginx + HTTPS
docker-compose -f docker-compose.prod.yml up -d

# 6. Verificar saúde
docker-compose -f docker-compose.prod.yml ps
curl -I https://seu-dominio.com/api/v1/health
```

---

## 📚 Documentação Rápida

| Item | Documento | Ação |
|------|-----------|------|
| 🔐 HTTPS | [setup-ssl.sh](./setup-ssl.sh) | Execute: `./setup-ssl.sh` |
| 🔑 Secrets | [docs/PRODUCTION_SECRETS.md](./docs/PRODUCTION_SECRETS.md) | Leia e preencha .env |
| 💾 Backup | [scripts/backup-production.sh](./scripts/backup-production.sh) | Execute: `./scripts/setup-backup-cron.sh` |
| 📊 Monitoramento | [docs/SENTRY_MONITORING.md](./docs/SENTRY_MONITORING.md) | Crie conta Sentry.io |

---

## ✅ Checklist Rápido

- [ ] `.env` criado com todas variáveis
- [ ] Certificados SSL em `./certs/`
- [ ] Backup script agendado em cron
- [ ] Sentry account criada e DSN adicionada
- [ ] `docker-compose up -d` rodando
- [ ] Verificar com `curl https://seu-dominio.com`

---

## 🎯 Próximas Ações

1. **Hoje**: Deploy com estes 4 críticos
2. **Semana 1**: Setup CI/CD (GitHub Actions)
3. **Semana 2**: Load testing + monitoring
4. **Semana 3**: Security audit (OWASP)
5. **Semana 4**: Analytics + otimizações
