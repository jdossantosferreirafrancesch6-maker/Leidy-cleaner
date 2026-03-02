# 📊 Sentry Monitoring Setup

**Data**: 01/03/2026  
**Status**: ✅ Error Tracking & Performance Monitoring Ready

---

## 1. Criar Conta & Projeto

### Setup Sentry
1. Ir em https://sentry.io/signup/
2. Criar nova organização
3. Criar novo projeto:
   - Platform: **Node.js**
   - Environment: **Production**
4. Copiar DSN (formato: `https://xxxx@xxxx.ingest.sentry.io/xxxxxx`)

---

## 2. Configurar Backend

### Variáveis de Ambiente
```bash
# .env (production)
SENTRY_DSN=https://your_key@your_project.ingest.sentry.io/12345
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1  # 10% de requests para performance monitoring
SENTRY_PROFILES_SAMPLE_RATE=0.01  # 1% para profiling
```

### Inicializar Sentry no App
```typescript
// src/main.ts - ANTES de qualquer código

import { initSentry, sentryRequestHandler, sentryErrorHandler } from './utils/sentry';

// Initialize FIRST
initSentry();

import app from './app';
import http from 'http';

// Add middlewares
app.use(sentryRequestHandler());

// ... rest of app configuration

// Add error handler at the END
app.use(sentryErrorHandler());

// Start server
const server = http.createServer(app);
server.listen(PORT);
```

### Reportar Erros Manualmente
```typescript
import { captureException, setUserContext, addTag } from './utils/sentry';

// In error handlers
try {
  // some code
} catch (error) {
  captureException(error, {
    userId: user.id,
    bookingId: booking.id,
  });
}

// Set user context for better tracking
setUserContext(user.id, {
  email: user.email,
  role: user.role,
});

// Add tags for filtering
addTag('feature', 'bookings');
addTag('environment', 'production');
```

---

## 3. Configurar Frontend (Next.js)

### Instalar Sentry Next.js
```bash
npm install @sentry/nextjs
```

### Integração Automática
```typescript
// next.config.js
const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  // ... other config
};

module.exports = withSentryConfig(
  nextConfig,
  {
    org: "seu-sentry-org",
    project: "seu-sentry-project",
    silent: false,
  }
);
```

### Variáveis de Ambiente
```bash
# .env.local (frontend)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxxxx
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Para CI/CD
SENTRY_AUTH_TOKEN=sntrys_xxxxxxxxxxxxxxxxxxxx (get from https://sentry.io/settings/auth-tokens/)
```

### Reportar Erros no Frontend
```typescript
import * as Sentry from "@sentry/nextjs";

try {
  // some code
} catch (error) {
  Sentry.captureException(error, {
    tags: {
      section: 'checkout',
    },
  });
}

// Set user context
Sentry.setUser({
  id: userId,
  email: userEmail,
});
```

---

## 4. Performance Monitoring

### Backend
```typescript
import * as Sentry from '@sentry/node';

// Trace database queries
const transaction = Sentry.startTransaction({
  op: "db.query",
  name: "SELECT users",
});

try {
  const users = await db.query('SELECT * FROM users');
} finally {
  transaction.finish();
}
```

### Frontend
```typescript
import * as Sentry from "@sentry/nextjs";

// Automatic performance monitoring for:
// - Next.js API routes
// - React component render times
// - Navigation performance
// - HTTP requests

// Manual transaction
const transaction = Sentry.startTransaction({
  name: "Checkout Flow",
  op: "checkout",
});

// ... checkout code

transaction.finish();
```

---

## 5. Configurar Alertas

### No Sentry Dashboard
1. Ir em **Alerts** → **Create Alert Rule**
2. Configurar triggers:
   - **When**: `Alert when...` → `An issue is seen X times in Y minutes`
   - **Then**: `Send to` → Email / Slack / PagerDuty

### Exemplo de Alertas
```
# Alert 1: Production Errors
Trigger: 10 errors in 5 minutes
Action: Send alert to #ops Slack

# Alert 2: High Error Rate
Trigger: >5% error rate
Action: Page on-call engineer

# Alert 3: New Issues
Trigger: A new issue is detected
Action: Email team
```

---

## 6. Integração com Slack

### Setup
1. Sentry Dashboard → **Integrations**
2. Buscar **Slack**
3. **Install**
4. Autorizar e selecionar canal

### Notificações Automáticas
- Novos issues
- Regressões (issue que voltou)
- Error rate spikes
- Release updates

---

## 7. Dashboard & Relatórios

### Métricas Importantes
```
📊 Dashboard Monitor:
  • Error Rate (% de requests com erro)
  • P95 Response Time (latência)
  • Throughput (requests/min)
  • Apdex Score (user satisfaction)

🐛 Issue Tracker:
  • Novos issues não resolvidos
  • Regressões
  • Regras de ignorar

📈 Performance:
  • Slowest Transactions
  • Most Affected Users
  • Database Query Times
```

### Reports
```bash
# Sentry API para relatórios automatizados
curl -X GET \
  https://sentry.io/api/0/organizations/{org}/issues/ \
  -H "Authorization: Bearer {token}"
```

---

## 8. Segurança & Histórico

### O que Não Enviar para Sentry
❌ Senhas
❌ Tokens (JWT, API keys)
❌ Dados pessoais (números de cartão, CPF)
❌ Informações médicas
❌ Dados de crédito

### Sentry Filtra Automaticamente
```typescript
// beforeSend em sentry.ts
if (event.request?.headers) {
  delete event.request.headers['authorization'];  // Remove JWT
  delete event.request.headers['x-api-key'];
  delete event.request.headers['cookie'];
}
```

### Retenção de Dados
- **Free**: 30 dias
- **Team**: 90 dias
- **Business**: Customizado

---

## 9. Exemplos de Uso

### Exemplo 1: Erro em Pagamento
```typescript
try {
  const payment = await stripe.charges.create({ ... });
} catch (error) {
  captureException(error, {
    userId: user.id,
    amount: amount,
    feature: 'payment',
  });
  
  // Ainda assim retorna erro ao usuário
  res.status(500).json({ error: 'Payment error' });
}
```

### Exemplo 2: Booking com Contexto
```typescript
router.post('/bookings', async (req, res) => {
  const userId = req.user.id;
  
  // Set context
  setUserContext(userId, {
    email: req.user.email,
  });
  
  addTag('feature', 'bookings');
  addTag('action', 'create');
  
  try {
    const booking = await createBooking(req.body);
    res.json(booking);
  } catch (error) {
    captureException(error);
    res.status(500).json({ error: 'Booking creation failed' });
  }
});
```

### Exemplo 3: Performance Monitoring
```typescript
router.get('/services', async (req, res) => {
  const span = Sentry.startSpan({
    name: 'List Services',
    op: 'db.query',
  });
  
  try {
    const services = await Service.find();
    span.setData('count', services.length);
    res.json(services);
  } finally {
    span.end();
  }
});
```

---

## 10. Troubleshooting

### Sentry Não Está Capturando Erros
```bash
# 1. Verificar SENTRY_DSN está configurado
echo $SENTRY_DSN

# 2. Verificar network
curl -X POST https://xxx.ingest.sentry.io/api/1234/envelope/ \
  -H "Content-Type: application/x-sentry-envelope"

# 3. Ativar debug
SENTRY_DEBUG=1 npm start
```

### Performance Muito Lento
```typescript
// Reduzir sample rate
tracesSampleRate: 0.01  // 1% em vez de 10%

// Ou desativar em endpoints específicos
beforeSend(event) {
  if (event.request?.url?.includes('/health')) {
    return null;  // Don't send
  }
}
```

---

## 📋 Checklist Deploy

- [ ] Sentry account criada
- [ ] Projetos criados (backend + frontend)
- [ ] DSNs adicionadas a `.env`
- [ ] `initSentry()` chamado no main.ts
- [ ] Sentry middleware adicionado ao Express
- [ ] nextjs config atualizado com sentry
- [ ] Integração Slack/Email configurada
- [ ] Alertas configurados
- [ ] Testar capturando erro manual
- [ ] Verificar dashboard recebendo dados
- [ ] Documentação atualizada no README
