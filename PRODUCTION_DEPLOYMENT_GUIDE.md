# 🚀 Guia Completo de Deployment para Produção

## Status: ✅ PRONTO PARA PRODUÇÃO

Este guia cobre o deployment completo da Leidy Cleaner para ambiente de produção com alta disponibilidade.

---

## 📋 Pré-requisitos

### Infra & Servidores
- ✅ VPS/Cloud (AWS EC2, DigitalOcean, Linode, etc)
- ✅ Ubuntu 22.04 LTS ou superior
- ✅ 4GB RAM mínimo, 50GB SSD
- ✅ Docker & Docker Compose

### Registros & Domínios
- ✅ Domínio configurado (leidycleaner.com.br)
- ✅ SSL/HTTPS (Let's Encrypt ou CloudFlare)
- ✅ DNS configurado (A record apontando para IP)

### Credenciais & Variáveis
- ✅ `.env.production` preenchido com valores reais
- ✅ Stripe Live Keys
- ✅ Database credentials seguras
- ✅ JWT secrets aleatórios

---

## 🔧 Etapa 1: Setup Inicial

### 1.1 Conectar ao servidor

```bash
ssh root@seu_ip_servidor
```

### 1.2 Atualizar sistema

```bash
apt update && apt upgrade -y
apt install -y curl wget git docker.io docker-compose
```

### 1.3 Clonar repositório

```bash
cd /opt
git clone https://github.com/seu-usuario/leidy-cleaner.git
cd leidy-cleaner
```

### 1.4 Configurar variáveis de ambiente

```bash
# Copiar template
cp .env.production.example .env.production

# Editar com valores reais
nano .env.production
```

**Variáveis essenciais:**
```env
# Server
BASE_URL=https://leidycleaner.com.br
FRONTEND_URL=https://leidycleaner.com.br
BACKEND_URL=https://api.leidycleaner.com.br

# Database
DATABASE_URL=postgresql://user:pass@postgres:5432/leidy_cleaner
NODE_ENV=production

# JWT
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)

# Stripe
STRIPE_SECRET_KEY=sk_live_... # Chave LIVE
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Email (Gmail ou SendGrid)
SMTP_USER=seu_email@gmail.com
SMTP_PASS=xyz_app_password_xys
SMTP_FROM=noreply@leidycleaner.com.br

# Segurança
ADMIN_EMAIL=admin@leidycleaner.com.br
ADMIN_PASSWORD=senha_super_segura_aqui
```

---

## 📦 Etapa 2: Build & Deploy

### 2.1 Executar setup de produção

```bash
chmod +x setup-production.sh
./setup-production.sh
```

Este script irá:
- ✅ Verificar dependências
- ✅ Criar estrutura de directories
- ✅ Gerar certificados SSL
- ✅ Configurar Nginx
- ✅ Setup backup automático

### 2.2 Fazer build das imagens Docker

```bash
docker-compose -f docker-compose.prod.yml build
```

### 2.3 Iniciar containers

```bash
docker-compose -f docker-compose.prod.yml up -d

# Verificar status
docker-compose -f docker-compose.prod.yml ps

# Logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### 2.4 Executar migrations

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### 2.5 Seed inicial (opcional)

```bash
docker-compose -f docker-compose.prod.yml exec backend npm run seed
```

---

## 🔐 Etapa 3: Segurança

### 3.1 SSL/HTTPS com Let's Encrypt

```bash
# Certificado será criado automaticamente pelo setup-production.sh
# Renovação automática via cron

# Verificar prazo do certificado
certbot certificates

# Renovar manualmente (se necessário)
certbot renew --dry-run
```

### 3.2 Firewall

```bash
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw status
```

### 3.3 Secrets & Credenciais

```bash
# Usar manager de secrets do seu cloud provider
# AWS: Systems Manager Parameter Store
# DigitalOcean: App Platform Secrets
# Ou usar .env.production com permissões restritas (600)

chmod 600 .env.production
```

---

## 🗄️ Etapa 4: Database

### 4.1 Backup automático

```bash
# Setup via cron (já feito pelo setup-production.sh)

# Testar backup manual
./scripts/backup-restore.sh full

# Listar backups
./scripts/backup-restore.sh list
```

### 4.2 Restore (se necessário)

```bash
./scripts/backup-restore.sh restore /path/to/backup.sql.gz
```

### 4.3 Monitoar database

```bash
# Conexões ativas
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d leidy_cleaner -c "SELECT * FROM pg_stat_activity;"

# Tamanho do banco
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d leidy_cleaner -c "SELECT pg_size_pretty(pg_database_size('leidy_cleaner'));"
```

---

## 📊 Etapa 5: Monitoramento

### 5.1 Logs

```bash
# Backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# Nginx logs
tail -f /var/log/nginx/leidy-cleaner.access.log
tail -f /var/log/nginx/leidy-cleaner.error.log

# Docker logs
docker logs -f avan-backend
```

### 5.2 Health Check

```bash
# Verificar saúde da aplicação
curl -s https://leidycleaner.com.br/health | jq .

# Status backend
curl -s https://api.leidycleaner.com.br/health | jq .

# Status database
curl -s https://api.leidycleaner.com.br/api/v1/admin/health/db | jq .
```

### 5.3 Métricas (Optional)

Setup com Prometheus + Grafana:

```bash
# Adicionar ao docker-compose.prod.yml
# services:
#   prometheus:
#     image: prom/prometheus
#     volumes:
#       - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
#   grafana:
#     image: grafana/grafana
#     ports:
#       - "3000:3000"
```

---

## 🚨 Etapa 6: Troubleshooting

### Problema: Container não inicia

```bash
# Verificar logs
docker logs avan-backend

# Verificar recursos
docker stats

# Reiniciar
docker-compose -f docker-compose.prod.yml restart backend
```

### Problema: SSL não funciona

```bash
# Verificar certificado
openssl x509 -in /etc/letsencrypt/live/leidycleaner.com.br/fullchain.pem -text -noout

# Renovar
certbot renew

# Recarregar nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload
```

### Problema: Database lento

```bash
# Analisar query lenta
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d leidy_cleaner -c "SELECT query, calls, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Vacuum
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -d leidy_cleaner -c "VACUUM ANALYZE;"
```

---

## 📈 Etapa 7: Manutenção

### Backups regulares

```bash
# Agendado via cron
# Shell script: ./scripts/backup-db.sh

# Executar manual
./scripts/backup-restore.sh full

# Verificar retenção
./scripts/backup-restore.sh stats
```

### Updates de código

```bash
# Pull da nova versão
git pull origin main

# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Restart containers
docker-compose -f docker-compose.prod.yml up -d

# Migrations (se necessário)
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### Limpeza

```bash
# Remover containers não utilizados
docker system prune -a

# Verificar espaço em disco
df -h

# Limpar logs antigos
find /var/log -type f -name "*.log" -mtime +30 -delete
```

---

## 🎯 Checklist Final

- [ ] ✅ Domínio configurado e DNS propagado
- [ ] ✅ SSL/HTTPS funcional
- [ ] ✅ Banco de dados backup automático ativo
- [ ] ✅ Email transacional funcionando
- [ ] ✅ Stripe Live Keys configuradas
- [ ] ✅ Admin user criado
- [ ] ✅ Firewall configurado
- [ ] ✅ Health checks respondendo
- [ ] ✅ Logs sendo coletados
- [ ] ✅ Monitoramento ativo
- [ ] ✅ Plano de rollback documentado
- [ ] ✅ Backup teste restaurado com sucesso

---

## 📞 Suporte

Para problemas, verificar:

1. Logs: `docker-compose logs -f`
2. Status: `docker ps -a`
3. Health: `curl https://leidycleaner.com.br/health`
4. Docs: `../TROUBLESHOOTING.md`

---

## 🔄 Rollback (se necessário)

```bash
# Parar aplicação
docker-compose -f docker-compose.prod.yml down

# Restaurar backup anterior
./scripts/backup-restore.sh restore /path/to/previous/backup.sql.gz

# Volta para código anterior
git checkout <commit_anterior>

# Rebuild e restart
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Verificar
curl https://leidycleaner.com.br/health
```

---

**Status:** 🟢 Pronto para Produção  
**Última atualização:** {% date %}  
**Versão:** 1.0 Production
