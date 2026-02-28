#!/bin/bash

# ============================================
# 🚀 SETUP PRODUÇÃO COMPLETA - LEIDY CLEANER
# ============================================
# Script para configurar ambiente de produção com:
# ✅ SSL/HTTPS (Let's Encrypt)
# ✅ Nginx configurado
# ✅ Backup automático
# ✅ Monitoramento
# ✅ CI/CD (GitHub Actions)

set -e

echo "🚀 Iniciando setup de produção..."
echo "================================="

# 1. VERIFICAR DEPENDÊNCIAS
echo "📦 Verificando dependências..."
command -v docker >/dev/null 2>&1 || { echo "❌ Docker não instalado"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose não instalado"; exit 1; }
command -v certbot >/dev/null 2>&1 || { echo "⚠️  Certbot não instalado. Instalando..."; apt-get update && apt-get install -y certbot python3-certbot-nginx; }
echo "✅ Dependências OK"

# 2. CRIAR ESTRUTURA DE DIRETÓRIOS
echo "📁 Criando estrutura de diretórios..."
mkdir -p ./backups/{daily,weekly,monthly}
mkdir -p ./logs/backend
mkdir -p ./logs/nginx
mkdir -p ./certs
mkdir -p ./.github/workflows
echo "✅ Diretórios criados"

# 3. GERAR SECRETS
echo "🔐 Gerando secrets..."
JWT_SECRET=$(openssl rand -hex 32)
JWT_REFRESH_SECRET=$(openssl rand -hex 32)
REDIS_PASSWORD=$(openssl rand -hex 16)
WEBHOOK_SECRET=$(openssl rand -hex 16)

echo "⚠️  Salve esses valores em um local seguro:"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo "REDIS_PASSWORD=$REDIS_PASSWORD"
echo "WEBHOOK_SECRET=$WEBHOOK_SECRET"
echo ""

# 4. CONFIGURAR SSL (Let's Encrypt)
read -p "Deseja configurar SSL agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    read -p "Digite seu domínio (ex: seu-dominio.com): " DOMAIN
    read -p "Digite seu email (para certificado): " EMAIL
    
    echo "🔒 Configurando SSL com Let's Encrypt..."
    sudo certbot certonly --standalone \
        -d $DOMAIN \
        -d www.$DOMAIN \
        -m $EMAIL \
        --agree-tos \
        --non-interactive
    
    echo "✅ SSL configurado em /etc/letsencrypt/live/$DOMAIN/"
    
    # Copiar certificados
    sudo cp /etc/letsencrypt/live/$DOMAIN/fullchain.pem ./certs/
    sudo cp /etc/letsencrypt/live/$DOMAIN/privkey.pem ./certs/
    sudo chown $(whoami):$(whoami) ./certs/*
fi

# 5. CONFIGURAR NGINX PARA PRODUÇÃO
echo "🌐 Configurando Nginx..."
cat > nginx.prod.conf << 'EOF'
upstream backend {
    server avan-backend:3001;
}

upstream frontend {
    server avan-frontend:3000;
}

# Redirecionar HTTP → HTTPS
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}

# HTTPS Principal
server {
    listen 443 ssl http2;
    server_name seu-dominio.com www.seu-dominio.com;

    # SSL Certificates
    ssl_certificate /etc/nginx/certs/fullchain.pem;
    ssl_certificate_key /etc/nginx/certs/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css text/javascript application/json application/javascript image/svg+xml;
    gzip_min_length 1024;

    # Frontend (Next.js)
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api/v1 {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files Cache
    location ~* \\.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Error Pages
    error_page 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
EOF
echo "✅ Nginx configurado"

# 6. CRIAR DOCKER COMPOSE PARA PRODUÇÃO
echo "🐳 Criando docker-compose para produção..."
if [ ! -f docker-compose.prod.yml ]; then
    echo "⚠️  docker-compose.prod.yml não encontrado. Crie com base em docker-compose.dev.yml"
fi

# 7. SETUP BACKUP AUTOMÁTICO
echo "⏰ Configurando backups automáticos..."
cat > /etc/cron.d/leidy-backup << 'EOF'
# Backup diário às 2AM
0 2 * * * /workspaces/Leidy-cleaner/backup-db.sh

# Backup semanal aos domingos às 3AM
0 3 * * 0 /workspaces/Leidy-cleaner/backup-full.sh

# Limpeza de backups antigos (manter 30 dias)
0 4 * * * find /workspaces/Leidy-cleaner/backups -type f -mtime +30 -delete
EOF
chmod 644 /etc/cron.d/leidy-backup
chmod +x ./backup-db.sh
echo "✅ Cron jobs configurados"

# 8. SETUP MONITORAMENTO
echo "📊 Configurando monitoramento..."
mkdir -p ./monitoring
cat > ./monitoring/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
EOF
echo "✅ Prometheus configurado"

# 9. CI/CD COM GITHUB ACTIONS
echo "🔄 Configurando GitHub Actions..."
mkdir -p .github/workflows
cat > .github/workflows/deploy-prod.yml << 'EOF'
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Backend Tests
        run: cd backend && npm ci && npm test
      
      - name: Frontend Build
        run: cd frontend && npm ci && npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Production
        run: |
          echo "🚀 Deploying to production..."
          # Add your deploy script here
          # Example: ssh deploy@seu-servidor.com './deploy-prod.sh'
      
      - name: Notify Slack
        if: always()
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
          payload: |
            {
              "text": "Deploy Status: ${{ job.status }}"
            }
EOF
echo "✅ GitHub Actions configurado"

# 10. CRIAR .ENV PARA PRODUÇÃO
echo "🔧 Criando arquivo .env.production..."
if [ ! -f .env.production ]; then
    cp .env.production.example .env.production
    echo "⚠️  Edite .env.production com suas credenciais reais!"
fi

# 11. VERIFICAÇÃO FINAL
echo ""
echo "✅ Setup de Produção Concluído!"
echo "================================="
echo ""
echo "📋 PRÓXIMAS ETAPAS:"
echo "1. Edite .env.production com credenciais reais"
echo "2. Configure docker-compose.prod.yml"
echo "3. Faça login no Docker Registry: docker login"
echo "4. Build e push das imagens: docker build ."
echo "5. Deploy com: docker-compose -f docker-compose.prod.yml up -d"
echo "6. Verifique saúde: curl https://seu-dominio.com/health"
echo ""
echo "🔐 IMPORTANTE:"
echo "- Guarde os secrets gerados em local seguro (password manager)"
echo "- Configure GitHub Secrets para CI/CD"
echo "- Teste backup/restore antes de usar em produção"
echo "- Monitore logs regularmente"
echo ""
echo "📞 Para suporte, consulte: DEPLOYMENT.md"
