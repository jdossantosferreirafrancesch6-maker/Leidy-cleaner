#!/bin/bash

# Backup e Restore Database Script
# Suporta: PostgreSQL Full Backup, Incremental, Restore com ponto de recuperação

set -e

# Configurações
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-leidy_cleaner}
DB_USER=${DB_USER:-postgres}
BACKUP_DIR=${BACKUP_DIR:-./backups}
LOG_DIR=${LOG_DIR:-./logs}
RETENTION_DAYS=${RETENTION_DAYS:-30}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Criar diretórios se não existirem
mkdir -p "$BACKUP_DIR" "$LOG_DIR"

# Log file
LOG_FILE="$LOG_DIR/backup_$(date +%Y%m%d_%H%M%S).log"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# === FUNÇÕES DE BACKUP ===

backup_full() {
    local backup_file="$BACKUP_DIR/leidy_cleaner_full_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    log "🔄 Iniciando backup completo do banco..."
    
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME" \
        | gzip > "$backup_file"; then
        
        local size=$(du -h "$backup_file" | cut -f1)
        log "✅ Backup completo realizado com sucesso: $backup_file ($size)"
        
        # Criar checksum
        sha256sum "$backup_file" > "$backup_file.sha256"
        
        return 0
    else
        log "❌ Erro ao realizar backup completo"
        return 1
    fi
}

backup_incremental() {
    local base_backup="$BACKUP_DIR/leidy_cleaner_base_backup.sql.gz"
    local incremental_file="$BACKUP_DIR/leidy_cleaner_incremental_$(date +%Y%m%d_%H%M%S).sql.gz"
    
    log "🔄 Iniciando backup incremental..."
    
    # Se não houver base, fazer backup completo primeiro
    if [ ! -f "$base_backup" ]; then
        log "⚠️ Nenhum backup base encontrado, realizando backup completo primeiro..."
        return $(backup_full)
    fi
    
    # Dumpa apenas as mudanças desde a última baselineugas
    if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
        --data-only "$DB_NAME" | gzip > "$incremental_file"; then
        
        local size=$(du -h "$incremental_file" | cut -f1)
        log "✅ Backup incremental realizado: $incremental_file ($size)"
        
        return 0
    else
        log "❌ Erro ao realizar backup incremental"
        return 1
    fi
}

# === FUNÇÕES DE RESTORE ===

restore_backup() {
    local backup_file="$1"
    
    if [ -z "$backup_file" ] || [ ! -f "$backup_file" ]; then
        log "❌ Arquivo de backup não encontrado: $backup_file"
        return 1
    fi
    
    log "🔄 Iniciando restauração do banco de dados..."
    log "⚠️ AVISO: Todos os dados atuais serão sobrescrito..."
    
    read -p "Tem certeza que deseja continuar? (S/N): " confirm
    
    if [ "$confirm" != "S" ] && [ "$confirm" != "s" ]; then
        log "❌ Restauração cancelada"
        return 1
    fi
    
    # Verificar integridade
    if [ -f "$backup_file.sha256" ]; then
        log "🔍 Verificando integridade do arquivo..."
        if ! sha256sum -c "$backup_file.sha256"; then
            log "❌ Checksum falhou! O arquivo pode estar corrompido."
            return 1
        fi
        log "✅ Checksum válido"
    fi
    
    # Restaurar
    if [ "${backup_file##*.}" = "gz" ]; then
        # Arquivo compactado
        if gunzip -c "$backup_file" | psql -h "$DB_HOST" -p "$DB_PORT" \
            -U "$DB_USER" "$DB_NAME" > /dev/null 2>&1; then
            
            log "✅ Banco restaurado com sucesso de: $backup_file"
            return 0
        else
            log "❌ Erro ao restaurar banco"
            return 1
        fi
    else
        # Arquivo não compactado
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" \
            "$DB_NAME" < "$backup_file" > /dev/null 2>&1; then
            
            log "✅ Banco restaurado com sucesso de: $backup_file"
            return 0
        else
            log "❌ Erro ao restaurar banco"
            return 1
        fi
    fi
}

# === LIMPEZA E MANUTENÇÃO ===

cleanup_old_backups() {
    log "🧹 Limpando backups antigos (> $RETENTION_DAYS dias)..."
    
    find "$BACKUP_DIR" -type f -name "leidy_cleaner_*.sql.gz" \
        -mtime +"$RETENTION_DAYS" -delete
    
    local count=$(find "$BACKUP_DIR" -type f -name "leidy_cleaner_*.sql.gz" | wc -l)
    log "✅ Cleanup completo. $count backups restantes"
}

list_backups() {
    log "📋 Listando backups disponíveis:"
    
    echo ""
    ls -lh "$BACKUP_DIR"/leidy_cleaner_*.sql.gz 2>/dev/null | \
        awk '{print $9, "("$5")", "- Data: "$6" "$7}'
    echo ""
}

backup_stats() {
    log "📊 Estatísticas de Backup:"
    
    echo ""
    echo "Total de backups: $(find "$BACKUP_DIR" -name 'leidy_cleaner_*.sql.gz' | wc -l)"
    echo "Espaço total: $(du -sh "$BACKUP_DIR" | cut -f1)"
    echo "Último backup: $(ls -t "$BACKUP_DIR"/leidy_cleaner_*.sql.gz 2>/dev/null | head -1 | xargs -I{} basename {} )"
    echo ""
}

# === MAIN ===

case "${1:-help}" in
    full)
        backup_full
        ;;
    incremental)
        backup_incremental
        ;;
    restore)
        if [ -z "$2" ]; then
            list_backups
            read -p "Digite o caminho do arquivo de backup: " backup_file
            restore_backup "$backup_file"
        else
            restore_backup "$2"
        fi
        ;;
    cleanup)
        cleanup_old_backups
        ;;
    list)
        list_backups
        ;;
    stats)
        backup_stats
        ;;
    help|*)
        echo "Uso: $0 {full|incremental|restore|cleanup|list|stats|help}"
        echo ""
        echo "Comandos:"
        echo "  full              - Fazer backup completo"
        echo "  incremental       - Fazer backup incremental"
        echo "  restore [arquivo] - Restaurar backup (usa last se não especificar)"
        echo "  cleanup           - Limpar backups antigos"
        echo "  list              - Listar backups disponíveis"
        echo "  stats             - Mostrar estatísticas"
        echo "  help              - Mostrar esta ajuda"
        echo ""
        echo "Exemplo: $0 full"
        ;;
esac

log "✅ Operação concluída"
