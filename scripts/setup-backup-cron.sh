#!/bin/bash
# 🔄 Setup Automatic Backup via Cron
# Configure automatic daily backups at 2:00 AM

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="$SCRIPT_DIR/backup-production.sh"
CRON_TIME="0 2 * * *"  # 2:00 AM daily

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔄 CONFIGURAR BACKUP AUTOMÁTICO                    ║"
echo "╚════════════════════════════════════════════════════════════╝"

# 1. Make script executable
chmod +x "$BACKUP_SCRIPT"
echo "✅ Script de backup executável"

# 2. Create backup directory
BACKUP_DIR="${BACKUP_DIR:=/opt/backups/leidy-cleaner}"
sudo mkdir -p "$BACKUP_DIR"
sudo chown $(whoami):$(whoami) "$BACKUP_DIR"
echo "✅ Diretório de backup criado: $BACKUP_DIR"

# 3. Add cron job
CRON_JOB="$CRON_TIME BACKUP_DIR=$BACKUP_DIR $BACKUP_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup-production.sh"; then
    echo "⚠️  Cron job já existe"
else
    (crontab -l 2>/dev/null || true; echo "$CRON_JOB") | crontab -
    echo "✅ Cron job agendado: $CRON_TIME"
fi

# 4. Show cron configuration
echo ""
echo "📋 Cronograma de Backup Configurado:"
crontab -l | grep "backup-production"

# 5. Optional: Enable S3 backup
read -p "Deseja ativar backup em S3 (AWS)? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    read -p "Digite o nome do bucket S3: " AWS_S3_BUCKET
    read -p "Digite o email para notificações: " BACKUP_EMAIL
    
    # Update cron with environment variables
    CRON_JOB="$CRON_TIME AWS_S3_BUCKET=$AWS_S3_BUCKET BACKUP_EMAIL=$BACKUP_EMAIL BACKUP_DIR=$BACKUP_DIR $BACKUP_SCRIPT"
    (crontab -l 2>/dev/null | grep -v "backup-production.sh"; echo "$CRON_JOB") | crontab -
    echo "✅ S3 backup ativado"
fi

echo ""
echo "🎉 Backup automático configurado!"
echo "   - Tempo: Diariamente às $CRON_TIME (2:00 AM)"
echo "   - Diretório: $BACKUP_DIR"
echo "   - Retenção: 30 dias"
echo ""
echo "💡 Para testar:"
echo "   $BACKUP_SCRIPT"
echo ""
echo "💡 Para ver logs:"
echo "   tail -f /var/log/syslog | grep CRON"
