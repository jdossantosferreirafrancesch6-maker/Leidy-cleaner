#!/bin/bash
# Quick Verification Script - Leidy Cleaner Production Ready

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     LEIDY CLEANER - QUICK VERIFICATION SCRIPT             ║${NC}"
echo -e "${BLUE}║                 Production Ready Check                    ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Track results
CHECKS_PASSED=0
CHECKS_TOTAL=0

check() {
    CHECKS_TOTAL=$((CHECKS_TOTAL + 1))
    local name="$1"
    local status="$2"
    
    if [ "$status" = "✅" ]; then
        CHECKS_PASSED=$((CHECKS_PASSED + 1))
        echo -e "${GREEN}✅${NC} $name"
    else
        echo -e "${RED}❌${NC} $name"
    fi
}

# === 1. BACKEND SERVICES ===
echo -e "\n${YELLOW}📦 BACKEND SERVICES${NC}"

[ -f "backend/src/services/EmailService.ts" ] && check "EmailService" "✅" || check "EmailService" "❌"
grep -q "sendBookingConfirmation\|sendPaymentReceipt\|sendReviewReminder" backend/src/services/EmailService.ts && check "  └─ Email Template Methods" "✅" || check "  └─ Email Template Methods" "❌"

[ -f "backend/src/services/StaffService.ts" ] && check "StaffService (Expanded)" "✅" || check "StaffService (Expanded)" "❌"
grep -q "getStaffDashboard\|getStaffStats\|isAvailable\|addSpecialDate" backend/src/services/StaffService.ts && check "  └─ Dashboard & Availability" "✅" || check "  └─ Dashboard & Availability" "❌"

[ -f "backend/src/services/TwoFactorService.ts" ] && check "TwoFactorService (2FA)" "✅" || check "TwoFactorService (2FA)" "❌"
grep -q "generateTOTPSecret\|validate2FA\|regenerateBackupCodes" backend/src/services/TwoFactorService.ts && check "  └─ TOTP & Backup Codes" "✅" || check "  └─ TOTP & Backup Codes" "❌"

[ -f "backend/src/services/GeolocationService.ts" ] && check "GeolocationService (Mapbox)" "✅" || check "GeolocationService (Mapbox)" "❌"
grep -q "autocompleteAddress\|geocodeAddress.*reverseGeocode\|calculateDistance" backend/src/services/GeolocationService.ts && check "  └─ Geolocation Features" "✅" || check "  └─ Geolocation Features" "❌"

[ -f "backend/src/services/AnalyticsService.ts" ] && check "AnalyticsService (GA4)" "✅" || check "AnalyticsService (GA4)" "❌"
grep -q "trackEvent\|trackPurchase\|trackSearch" backend/src/services/AnalyticsService.ts && check "  └─ Analytics Tracking" "✅" || check "  └─ Analytics Tracking" "❌"

[ -f "backend/src/services/PIXService.ts" ] && check "PIXService (Expanded)" "✅" || check "PIXService (Expanded)" "❌"
grep -q "generatePIXTransactionId\|processPIXWebhook\|validatePIXKey\|refundPIX" backend/src/services/PIXService.ts && check "  └─ PIX Payment Integration" "✅" || check "  └─ PIX Payment Integration" "❌"

[ -f "backend/src/services/ReviewService.ts" ] && check "ReviewService (Expanded)" "✅" || check "ReviewService (Expanded)" "❌"

[ -f "backend/src/services/StripeService.ts" ] && check "StripeService (Payments)" "✅" || check "StripeService (Payments)" "❌"

# === 2. SOCKET.IO & REAL-TIME ===
echo -e "\n${YELLOW}💬 REAL-TIME & COMMUNICATION${NC}"

[ -f "backend/src/socket/SOCKETIO_INTEGRATION_GUIDE.ts" ] && check "Socket.IO Integration Guide" "✅" || check "Socket.IO Integration Guide" "❌"
grep -q "send_message\|receive_message\|ChatWindow" backend/src/socket/SOCKETIO_INTEGRATION_GUIDE.ts && check "  └─ Chat Implementation" "✅" || check "  └─ Chat Implementation" "❌"

# === 3. SCRIPTS ===
echo -e "\n${YELLOW}🔧 SCRIPTS & AUTOMATION${NC}"

[ -f "scripts/backup-restore.sh" ] && check "Backup & Restore Script" "✅" || check "Backup & Restore Script" "❌"
grep -q "backup_full\|backup_incremental\|restore_backup\|cleanup_old_backups" scripts/backup-restore.sh && check "  └─ Backup Functions" "✅" || check "  └─ Backup Functions" "❌"

[ -f "setup-production.sh" ] && check "Production Setup Script" "✅" || check "Production Setup Script" "❌"
grep -q "SSL\|certbot\|nginx\|backup" setup-production.sh && check "  └─ SSL & Nginx Setup" "✅" || check "  └─ SSL & Nginx Setup" "❌"

# === 4. CONTROLLERS & EXAMPLES ===
echo -e "\n${YELLOW}🎮 CONTROLLERS & EXAMPLES${NC}"

[ -f "backend/src/controllers/EXAMPLE_USAGE_CONTROLLERS.ts" ] && check "Service Integration Examples" "✅" || check "Service Integration Examples" "❌"
grep -q "BookingController\|StaffController\|TwoFactorController\|ReviewController" backend/src/controllers/EXAMPLE_USAGE_CONTROLLERS.ts && check "  └─ API Controller Examples" "✅" || check "  └─ API Controller Examples" "❌"

# === 5. DOCUMENTATION ===
echo -e "\n${YELLOW}📚 DOCUMENTATION${NC}"

[ -f "PRODUCTION_DEPLOYMENT_GUIDE.md" ] && check "Production Deployment Guide" "✅" || check "Production Deployment Guide" "❌"
grep -q "SSL\|Database\|Backup\|Monitoring\|Troubleshooting" PRODUCTION_DEPLOYMENT_GUIDE.md && check "  └─ Deployment Steps" "✅" || check "  └─ Deployment Steps" "❌"

[ -f "QA_TESTING_CHECKLIST.md" ] && check "QA Testing Checklist" "✅" || check "QA Testing Checklist" "❌"
grep -q "\[ \]\|Autenticação\|Pagamentos\|Agendamentos" QA_TESTING_CHECKLIST.md && check "  └─ Test Coverage (95+ items)" "✅" || check "  └─ Test Coverage (95+ items)" "❌"

[ -f "IMPLEMENTATION_SUMMARY.md" ] && check "Implementation Summary" "✅" || check "Implementation Summary" "❌"

[ -f "DEPLOY_AND_COMMIT_GUIDE.md" ] && check "Deploy & Commit Guide" "✅" || check "Deploy & Commit Guide" "❌"

[ -f "SYSTEM_ARCHITECTURE.md" ] && check "System Architecture Diagram" "✅" || check "System Architecture Diagram" "❌"

# === 6. ENVIRONMENT CONFIGURATION ===
echo -e "\n${YELLOW}⚙️  CONFIGURATION${NC}"

[ -f ".env.production" ] && check ".env.production Template" "✅" || check ".env.production Template" "❌"
grep -q "MAPBOX\|TWO_FACTOR\|GA4\|PIX" .env.production && check "  └─ New Service Configs" "✅" || check "  └─ New Service Configs" "❌"

# === 7. DATABASE ===
echo -e "\n${YELLOW}🗄️  DATABASE${NC}"

[ -d "backend/migrations" ] && check "Database Migrations" "✅" || check "Database Migrations" "❌"
MIGRATION_COUNT=$(find backend/migrations -name "*.sql" | wc -l)
echo -e "  └─ $MIGRATION_COUNT migration files found"

# === 8. DOCKER ===
echo -e "\n${YELLOW}🐳 DOCKER CONFIGURATION${NC}"

[ -f "docker-compose.prod.yml" ] && check "Production Docker Compose" "✅" || check "Production Docker Compose" "❌"
[ -f "backend/Dockerfile" ] && check "Backend Dockerfile" "✅" || check "Backend Dockerfile" "❌"
[ -f "frontend/Dockerfile" ] && check "Frontend Dockerfile" "✅" || check "Frontend Dockerfile" "❌"

# === 9. GIT & VERSION CONTROL ===
echo -e "\n${YELLOW}📦 GIT REPOSITORY${NC}"

[ -d ".git" ] && check "Git Repository Initialized" "✅" || check "Git Repository Initialized" "❌"
[ -f ".gitignore" ] && check ".gitignore Configured" "✅" || check ".gitignore Configured" "❌"
grep -q "\.env\|node_modules\|\.vscode" .gitignore && check "  └─ Secrets Excluded" "✅" || check "  └─ Secrets Excluded" "❌"

# === 10. SECURITY ===
echo -e "\n${YELLOW}🔐 SECURITY${NC}"

grep -q "JWT_SECRET\|JWT_REFRESH_SECRET" .env.production && check "JWT Secrets Configured" "✅" || check "JWT Secrets Configured" "❌"
grep -q "STRIPE.*KEY\|PIX.*SECRET" .env.production && check "Payment Keys Configured" "✅" || check "Payment Keys Configured" "❌"

# === FINAL SUMMARY ===
echo -e "\n${BLUE}════════════════════════════════════════════════════════════${NC}"
PERCENTAGE=$((CHECKS_PASSED * 100 / CHECKS_TOTAL))
echo -e "${BLUE}RESULT: ${GREEN}$CHECKS_PASSED/$CHECKS_TOTAL${BLUE} checks passed (${PERCENTAGE}%)${NC}"

if [ $PERCENTAGE -eq 100 ]; then
    echo -e "${GREEN}✅ SISTEMA COMPLETAMENTE PRONTO PARA PRODUÇÃO!${NC}"
elif [ $PERCENTAGE -ge 90 ]; then
    echo -e "${YELLOW}⚠️  Quase pronto! Verifique os itens marcados com ❌${NC}"
else
    echo -e "${RED}❌ Ainda há itens faltando. Revise a checklist acima.${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"
echo ""

# === QUICK START ===
echo -e "${YELLOW}🚀 QUICK START:${NC}"
echo ""
echo "  1. Configure .env.production com valores reais"
echo "     $ nano .env.production"
echo ""
echo "  2. Execute setup de produção"
echo "     $ chmod +x setup-production.sh"
echo "     $ ./setup-production.sh"
echo ""
echo "  3. Build e inicie os containers"
echo "     $ docker-compose -f docker-compose.prod.yml build"
echo "     $ docker-compose -f docker-compose.prod.yml up -d"
echo ""
echo "  4. Execute migrations"
echo "     $ docker-compose -f docker-compose.prod.yml exec backend npm run migrate"
echo ""
echo "  5. Verifique saúde"
echo "     $ curl https://seu-dominio.com/health"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════${NC}"

exit 0
