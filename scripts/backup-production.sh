#!/bin/bash
# 🔄 Production Backup Script
# Backup automático de BD + arquivos críticos
# Execute via cron: 0 2 * * * /path/to/backup-production.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configurações
BACKUP_DIR="${BACKUP_DIR:=/opt/backups/leidy-cleaner}"
CONTAINER_NAME="leidy-api"
DB_PATH="/app/data/data.db"
RETENTION_DAYS="${RETENTION_DAYS:=30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

echo -e "${YELLOW}🔄 Iniciando backup - $TIMESTAMP${NC}"

# 1. Backup do Banco de Dados
echo -e "${YELLOW}📊 Fazendo backup do BD...${NC}"
if docker ps | grep -q "$CONTAINER_NAME"; then
    BACKUP_FILE="$BACKUP_DIR/database_$TIMESTAMP.db.gz"
    
    docker exec "$CONTAINER_NAME" sh -c "gzip -c '$DB_PATH' > /tmp/backup_$TIMESTAMP.gz"
    docker cp "$CONTAINER_NAME:/tmp/backup_$TIMESTAMP.gz" "$BACKUP_FILE"
    docker exec "$CONTAINER_NAME" rm "/tmp/backup_$TIMESTAMP.gz"
    
    FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo -e "${GREEN}✅ BD backeado: $BACKUP_FILE ($FILE_SIZE)${NC}"
else
    echo -e "${RED}❌ Container $CONTAINER_NAME não encontrado${NC}"
    exit 1
fi

# 2. Backup de Arquivos Críticos
echo -e "${YELLOW}📁 Fazendo backup de arquivos...${NC}"
CRITICAL_FILES=(
    ".env"
    "docker-compose.prod.yml"
    "nginx.prod.conf"
    "certs/cert.pem"
    "certs/key.pem"
)

CONFIG_BACKUP="$BACKUP_DIR/config_$TIMESTAMP.tar.gz"
tar -czf "$CONFIG_BACKUP" \
    --ignore-failed-read \
    --exclude=node_modules \
    --exclude=.git \
    ${CRITICAL_FILES[@]} 2>/dev/null || true

CONFIG_SIZE=$(du -h "$CONFIG_BACKUP" | cut -f1)
echo -e "${GREEN}✅ Config backeada: $CONFIG_BACKUP ($CONFIG_SIZE)${NC}"

# 3. Backup de Uploads (se existir)
echo -e "${YELLOW}📸 Fazendo backup de uploads...${NC}"
if [ -d "backend/uploads" ]; then
    UPLOADS_BACKUP="$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz"
    tar -czf "$UPLOADS_BACKUP" backend/uploads
    UPLOADS_SIZE=$(du -h "$UPLOADS_BACKUP" | cut -f1)
    echo -e "${GREEN}✅ Uploads backeados: $UPLOADS_BACKUP ($UPLOADS_SIZE)${NC}"
fi

# 4. Limpeza de Backups Antigos
echo -e "${YELLOW}🗑️  Limpando backups antigos...${NC}"
find "$BACKUP_DIR" -name "*.gz" -type f -mtime "+$RETENTION_DAYS" -delete
echo -e "${GREEN}✅ Backups com mais de $RETENTION_DAYS dias removidos${NC}"

# 5. Verificação de Integridade
echo -e "${YELLOW}🔍 Verificando integridade...${NC}"
if gunzip -t "$BACKUP_FILE" 2>/dev/null; then
    echo -e "${GREEN}✅ Backup íntegro e recuperável${NC}"
else
    echo -e "${RED}❌ ERRO: Backup corrompido!${NC}"
    exit 1
fi

# 6. Envio para Cloud (opcional)
if command -v aws &> /dev/null && [ ! -z "$AWS_S3_BUCKET" ]; then
    echo -e "${YELLOW}☁️  Enviando para S3...${NC}"
    aws s3 cp "$BACKUP_FILE" "s3://$AWS_S3_BUCKET/leidy-cleaner/$TIMESTAMP/"
    aws s3 cp "$CONFIG_BACKUP" "s3://$AWS_S3_BUCKET/leidy-cleaner/$TIMESTAMP/"
    echo -e "${GREEN}✅ Backup enviado para S3${NC}"
fi

# 7. Notificação por Email
if command -v mail &> /dev/null && [ ! -z "$BACKUP_EMAIL" ]; then
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
    mail -s "📊 Backup Leidy Cleaner - $TIMESTAMP" "$BACKUP_EMAIL" <<EOF
Backup automático concluído com sucesso!

⏰ Timestamp: $TIMESTAMP
📊 BD: $FILE_SIZE
📁 Config: $CONFIG_SIZE
💾 Total: $TOTAL_SIZE
📍 Localização: $BACKUP_DIR

Próximo backup: Automático às 2:00 AM
EOF
    echo -e "${GREEN}✅ Email de notificação enviado${NC}"
fi

echo -e "${GREEN}🎉 Backup completo!${NC}"
df -h "$BACKUP_DIR"
