# 🔍 AUDITORIA CRÍTICA - Leidy Cleaner 01/03/2026

**Status**: 🚨 PROBLEMAS ENCONTRADOS (Bloqueadores para Deploy)

---

## 🚨 BUGS CRÍTICOS (Impedem Testes/Deploy)

### 1. **❌ AnalyticsService.ts - Import Axios Faltando**

**Arquivo**: `backend/src/services/AnalyticsService.ts`  
**Linha**: 306  
**Erro**: `TS2304: Cannot find name 'axios'`

```typescript
// ❌ ERRO - axios nunca foi importado
await axios.post(`${GA4_ENDPOINT}...`)
```

**Impacto**:
- ❌ Bloqueia compilação TypeScript
- ❌ Testes de analytics falham
- ❌ `npm test` não passa

**Solução**: Adicionar import no início do arquivo

---

### 2. **❌ CacheService.ts - Variável Declarada Mas Nunca Usada**

**Arquivo**: `backend/src/services/CacheService.ts`  
**Linha**: 66  
**Erro**: `TS6133: 'err' is declared but its value is never read`

```typescript
// ❌ ERRO - err está unused
this.client.on('error', (err: Error) => {
  this.isConnected = false;
  // Silent logging...
});
```

**Impacto**:
- ❌ Bloqueia compilação TypeScript
- ❌ Testes de chat falham
- ❌ `npm test` não passa

**Solução**: Renomear para `_err` ou usar `err`

---

## ⚠️ PROBLEMAS DE ARQUITETURA (Funcionam mas são Gambiarras)

### 3. **🚨 Database RETURNING Simulation (Crítico em Produção)**

**Arquivo**: `backend/src/utils/database.ts`  
**Linhas**: 95-147  
**Tipo**: Gambiarra crítica

#### O Problema

SQLite não suporta RETURNING clause. A solução atual faz:

```typescript
// 1. Executa INSERT/UPDATE
sqliteDb.run(sql, params, function() {
  // 2. Tenta detectar tabela com REGEX
  const insertMatch = sql.match(/insert\s+into\s+["'`]?([a-zA-Z0-9_]+)["'`]?/i);
  const table = insertMatch[1];
  
  // 3. Faz SELECT separado para retornar dados
  sqliteDb.all(`SELECT * FROM ${table} WHERE id = ?`, [lastID])
});
```

#### Riscos

| Risco | Exemplo | Impacto |
|-------|---------|--------|
| Regex frágil | INSERT com schema complexo | `SELECT *` retorna colunas erradas |
| Assume lastID | UPDATE sem RETURNING | Retorna null ou dado errado |
| Múltiplos params | `WHERE id = ? AND status = ?` | Qual é o ID? |
| Query complexa | CTEs, subqueries, joins | Regex quebra |
| Alias não detectados | `INSERT INTO users us (...)` | Table name errado |

#### Exemplo que Quebra

```typescript
// ❌ QUEBRA: Schema com campos adicionais
const users = await query(
  `INSERT INTO users (email, password_hash, full_name, phone, role, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
   RETURNING id, email, full_name, phone, role, created_at`
);
// Retorna: SELECT * FROM users WHERE id = ? (todas 15 colunas, não as 6 que esperava)

// ❌ QUEBRA: UPDATE sem ID claro
const updated = await query(
  `UPDATE users SET name = $1 WHERE email = $2 RETURNING *`,
  ['John', 'john@test.com']
);
// Tenta: SELECT * FROM users WHERE id = ? (qual id??? $2 é email!)
```

#### Impacto Real

- ❌ INSERT retorna dados incompletos/extras
- ❌ UPDATE pode retornar linha errada
- ❌ Frontend recebe schema inconsistente
- ❌ Difícil debugar (funciona às vezes)

---

### 4. **🚨 Dev/Prod Database Mismatch**

**docker-compose.dev.yml**:
```yaml
backend:
  environment:
    - DB_HOST=db           # PostgreSQL!
    - DB_PORT=5432
```

**docker-compose.prod.yml**:
```yaml
api:
  environment:
    - DB_TYPE=sqlite       # SQLite!
```

#### O Problema

- ❌ `docker-compose up` com dev.yml usa PostgreSQL
- ❌ Production roda com SQLite
- ❌ Testes passam com Postgres, quebram com SQLite
- ❌ RETURNING gambiarra só afeta SQLite (dev não vê)

#### Configuração Confusa

**backend/src/config.ts**:
```typescript
export const DB_TYPE = process.env.DB_TYPE || 'sqlite';  // Default SQLite
```

**docker-compose.dev.yml NÃO define DB_TYPE**, então:
- DB_TYPE = undefined → assume 'sqlite'
- Mas DB_HOST = 'db' → tenta PostgreSQL!
- 🤯 Qual vence? A lógica no database.ts trata por:
  - Se SQLite → use `sqliteDb`
  - Else → use `pool` (Postgres)

**Resultado**: Começa com SQLite, depois database.ts vê DB_HOST='db' e tenta Postgres. Inconsistência total!

---

###  5. **⚠️ Rate Limiting Não é Distribuído**

**Arquivo**: `backend/src/middleware/userRateLimit.ts`  
**Linha**: 45

```typescript
export const userRateLimit = rateLimit({
  // ...
  store: undefined,  // MemoryStore (cada servidor tem seu counter!)
});
```

#### O Problema (Em Produção)

Com 3 servidores e rate limit de 100 req/15min:

```
Atacante faz:
- 100 hits ao servidor 1 ✅ Bloqueado
- 100 hits ao servidor 2 ✅ Bloqueado
- 100 hits ao servidor 3 ✅ Bloqueado
- Total: 300 hits (deveria ser 100!)
```

Cada servidor tem seu próprio counter em memória.

#### Solução

Store precisa ser Redis em produção (código já menciona isso).

---

### 6. **⚠️ Redis Não Configurado em Produção**

**docker-compose.prod.yml**: Não tem container Redis!

```yaml
services:
  api:
    environment:
      - REDIS_HOST=redis   # ❌ Container não existe!
```

**Impacto**:
- ❌ CacheService.ts tenta conectar a Redis inexistente
- ⚠️ Fallback silencioso (continua sem cache)
- ⚠️ Performance degradada sem cache

**Status**: Funciona mas sem benefício

---

### 7. **⚠️ Frontend API URL Incorreta**

**docker-compose.dev.yml** linha 55:
```yaml
environment:
  - NEXT_PUBLIC_API_URL=http://backend:3001
```

**Problema**:
- ❌ Browser não consegue resolver `http://backend:3001`
- ❌ `backend` é nome DNS interno do Docker (container)
- ❌ Browser em localhost não consegue acessar container 'backend'

**Funciona**: Apenas se houver Nginx proxy (mascarado como `/api/v1`)  
**Quebra**: Se access frontend direto ou tiver CORS

**Correto**: `/api/v1` (proxy relativo) ou `http://localhost:3001`

---

### 8. **⚠️ PIX Payment Fake**

**Arquivo**: `backend/src/services/PIXService.ts`  
**Linha**: 43

```typescript
// TODO: Integrar com banco real ou gateway PIX
// ❌ Retorna PIX fake, não cobra de verdade!
```

**Impacto**:
- ❌ Booking marcado como "paid" sem pagamento real
- ❌ Ninguém pagou de verdade
- ❌ Arriscado para produção

**Status**: Dev only, não deploy!

---

### 9. **⚠️ SMS/WhatsApp Não Implementado**

**Arquivo**: `backend/src/services/NotificationService.ts`  
**Linha**: 442

```typescript
// TODO: Implementar SMS com Twilio
// ❌ SMS não funciona, apenas email
```

**Impacto**:
- ❌ Twilio não integrado
- ❌ Notificações SMS falham silenciosamente

---

### 10. **⚠️ Geolocation Queries Mockadas**

**Arquivo**: `backend/src/services/GeolocationService.ts`  
**Linha**: 283

```typescript
// TODO: Executar query real no banco
// ❌ Retorna dados mockados, não reais
```

**Impacto**:
- ❌ Localização não funciona
- ❌ Dispatch ineficiente

---

## 📊 Status do Projeto

| Componente | Status | Problema |
|-----------|--------|----------|
| **TypeScript** | ❌ Não compila | 2 erros (axios, err variable) |
| **Testes** | ❌ Falham (4/6 suites) | Erros TypeScript + refresh token duplicates |
| **Dev Docker** | ⚠️ Ambíguo | Database type mismatch (SQLite vs Postgres) |
| **Prod Docker** | ⚠️ Incompleto | Sem Redis |
| **Database** | ⚠️ Frágil | RETURNING simulation quebra com queries complexas |
| **Auth** | ✅ Funciona | JWT + refresh tokens OK |
| **API** | ⚠️ Parcial | Endpoints OK, mas payloads podem estar errados |
| **Frontend** | ⚠️ Conecta parcialmente | API URL inadequada |
| **Rate Limiting** | ⚠️ Não distribuído | MemoryStore em dev/prod |
| **PII/Payments** | ⚠️ Fake | PIX mock, não real |

---

## 🔧 PLANO DE CORREÇÃO

### 🚨 HOJE (Bloqueadores)

```bash
# 1. Corrigir AnalyticsService - adicionar import axios
npm install axios  # Se não estiver
sed -i '2i import axios from "axios";' backend/src/services/AnalyticsService.ts

# 2. Corrigir CacheService - renomear err para _err
sed -i 's/(err: Error)/(\_err: Error)/g' backend/src/services/CacheService.ts

# 3. Corrigir database type em dev
# Adicionar ao docker-compose.dev.yml backend.environment:
#   - DB_TYPE=sqlite

# 4. Rodar testes
npm test  # Deve passar 100%
```

### ⚠️ SEMANA 1 (Antes de Produção)

- [ ] Revisar database.ts RETURNING simulation
- [ ] Simular queries complexas (JOIN, CTE, UNION)
- [ ] Fix refresh token duplicates
- [ ] Adicionar Redis ao docker-compose.prod.yml
- [ ] Validar CSRF protection (cookies vs body)
- [ ] Load test com 3servidores

### 📋 SEMANA 2 (Post-Launch)

- [ ] Implementar PIX real
- [ ] Implementar SMS/Twilio
- [ ] Implementar geolocation real
- [ ] Migrar rate limiting para Redis

---

## ✅ O QUE FUNCIONA BEM

✅ Autenticação JWT + refresh tokens  
✅ CRUD serviços, bookings, reviews  
✅ Validações Joi  
✅ Socket.IO chat em tempo real  
✅ Helmet security headers  
✅ CORS configurado corretamente  
✅ Nginx proxy funcionando  
✅ Docker compose (estrutura)  
✅ Frontend Next.js carrega  
✅ Helmet CSP, HSTS, X-Frame-Options  

---

## 📝 Conclusão

**Status Geral**: 🟡 **65% Pronto**

- ✅ Arquitetura é sólida
- ❌ 2 erros TypeScript bloqueadores
- ⚠️ Database design tem risco em prod
- ⚠️ Integração dev/prod inconsistente
- ✅ Funcionalidades core trabalham
- ❌ PIX/SMS fake, não deploy ainda

**Recomendação**: 
1. Corrigir erros TypeScript (1h)
2. Usar SQLite em dev + prod (remove gambiarra)
3. Load test completo antes de lançar
4. Implementar PIX real ANTES de aceitar pagamentos
