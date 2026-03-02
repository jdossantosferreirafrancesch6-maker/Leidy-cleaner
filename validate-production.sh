#!/bin/bash

#################################################################################
#  VALIDATION SCRIPT - Testa se tudo está pronto para produção
#################################################################################

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

tests_passed=0
tests_failed=0

test_check() {
    local test_name="$1"
    local command="$2"
    
    echo -n "Testing: $test_name... "
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        ((tests_passed++))
    else
        echo -e "${RED}✗${NC}"
        ((tests_failed++))
    fi
}

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  VALIDATION SCRIPT - Leidy Cleaner Production Readiness"
echo "════════════════════════════════════════════════════════════════"
echo ""

echo -e "${BLUE}[1/5] Checking System Requirements${NC}"
test_check "Docker is installed" "command -v docker"
test_check "Docker Compose is installed" "command -v docker-compose"
test_check "Node.js is installed" "command -v node"
test_check "npm is installed" "command -v npm"
test_check "Git is installed" "command -v git"

echo ""
echo -e "${BLUE}[2/5] Checking Backend Build${NC}"
test_check "Backend dist exists" "[ -d 'backend/dist' ]"
test_check "Backend has compiled files" "[ -f 'backend/dist/main.js' ]"
test_check "package.json exists (backend)" "[ -f 'backend/package.json' ]"

echo ""
echo -e "${BLUE}[3/5] Checking Frontend Build${NC}"
test_check "Frontend .next exists" "[ -d 'frontend/.next' ]"
test_check "Frontend package.json" "[ -f 'frontend/package.json' ]"
test_check "TailwindCSS config exists" "[ -f 'frontend/tailwind.config.js' ]"

echo ""
echo -e "${BLUE}[4/5] Checking Configuration Files${NC}"
test_check "docker-compose.prod.yml exists" "[ -f 'docker-compose.prod.yml' ]"
test_check "nginx.prod.conf exists" "[ -f 'nginx.prod.conf' ]"
test_check "Migrations folder exists" "[ -d 'backend/migrations' ]"
test_check "Database seed exists" "[ -f 'backend/migrations/seed.sql' ] || [ -f 'backend/migrations_sqlite/seed.sql' ]"

echo ""
echo -e "${BLUE}[5/5] Checking Documentation${NC}"
test_check "README exists" "[ -f 'README.md' ]"
test_check "DEPLOY_CHECKLIST exists" "[ -f 'DEPLOY_CHECKLIST.md' ]"
test_check "FINISHED_PROJECT_SUMMARY exists" "[ -f 'FINISHED_PROJECT_SUMMARY.md' ]"
test_check "API docs in backend" "[ -f 'backend/src/utils/swagger.ts' ]"

echo ""
echo -e "${BLUE}[6/5] Checking Security & Secrets${NC}"
# Ensure no default development secrets remain
# looks for common placeholder strings
test_check "No placeholder JWT secret" "! grep -R --color=never -nH "change_this" .env* 2>/dev/null"
test_check "No test Stripe keys" "! grep -R --color=never -nH "sk_test_" .env* 2>/dev/null"
# npm audit high/critical vulnerabilities (production deps only)
test_check "Backend npm audit (no high/critical in prod deps)" "cd backend && npm audit --production --json | grep -q '\"high\": 0' && grep -q '\"critical\": 0' || false"
# SSL certificate files (optional, but recommended).
# In CI we usually don't have real certs, so allow passing when CI=true.
test_check "SSL certificate exists" "[ \"$CI\" = true ] || ([ -f 'certs/cert.pem' ] && [ -f 'certs/key.pem' ]) || false"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  VALIDATION RESULTS"
echo "════════════════════════════════════════════════════════════════"
echo -e "Testes Passou: ${GREEN}$tests_passed${NC}"
echo -e "Testes Falharam: ${RED}$tests_failed${NC}"
echo ""

if [ $tests_failed -eq 0 ]; then
    echo -e "${GREEN}✓ TUDO PRONTO PARA PRODUÇÃO!${NC}"
    echo ""
    echo "Próximo passo: Execute ./deploy-final.sh"
    exit 0
else
    echo -e "${RED}✗ Existem $tests_failed problemas${NC}"
    echo ""
    echo "Corrija os problemas acima antes de fazer deploy"
    exit 1
fi
