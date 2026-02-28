# ✅ Checklist QA - Leidy Cleaner

## Macrocategorias: 09 | Total de Itens: 95

---

## 1️⃣ AUTENTICAÇÃO & AUTORIZAÇÃO (12 itens)

### Registro (Sign Up)
- [ ] Usuário consegue se registrar com email válido
- [ ] Validação de email obrigatório
- [ ] Validação de senha (mínimo 8 caracteres)
- [ ] Confirmação de email enviada
- [ ] Verificação de email duplicado
- [ ] Termos e Condições aceitação obrigatória
- [ ] Google Sign-In funciona
- [ ] Facebook Sign-In funciona

### Login
- [ ] Login com email e senha funciona
- [ ] Mensagem de erro para credenciais inválidas
- [ ] Token JWT gerado e armazenado
- [ ] Refresh token funciona após 24h

### 2FA
- [ ] 2FA pode ser ativado para admin
- [ ] TOTP (Google Authenticator) funciona
- [ ] Backup codes gerados corretamente
- [ ] Login com 2FA requerido para admin

---

## 2️⃣ USUÁRIO & PERFIL (18 itens)

### Perfil Cliente
- [ ] Editar nome/telefone funciona
- [ ] Upload de foto de perfil
- [ ] Histórico de endereços salvos
- [ ] Endereço padrão pode ser configurado
- [ ] Visualizar histórico de agendamentos
- [ ] Excluir conta (soft delete)
- [ ] Export de dados pessoais (LGPD)

### Perfil Staff
- [ ] Visualizar disponibilidade
- [ ] Editar horários de disponibilidade
- [ ] Marcar folgas/férias
- [ ] Ver agendamentos atribuídos
- [ ] Dashboard com próximos agendamentos
- [ ] Atualizar status do agendamento (em progresso/concluído)
- [ ] Visualizar histórico de reviews
- [ ] Responder a reviews

### Admin
- [ ] Dashboard com métricas
- [ ] Gerenciar usuários (listar/editar/desativar)
- [ ] Gerenciar serviços (CRUD)
- [ ] Moderar reviews (aprovar/rejeitar)
- [ ] Visualizar logs
- [ ] Download de relatórios

---

## 3️⃣ SERVIÇOS (14 itens)

### Catálogo
- [ ] Listar todos os serviços
- [ ] Filtrar serviços por categoria
- [ ] Buscar serviços por nome
- [ ] Paginação funciona
- [ ] Valores em BRL exibidos corretamente
- [ ] Imagens do serviço exibem corretamente
- [ ] Descrição completa acessível
- [ ] Reviews do serviço exibem

### Admin - Gerenciar Serviços
- [ ] Criar novo serviço
- [ ] Editar serviço existente
- [ ] Deletar serviço
- [ ] Upload de imagem do serviço
- [ ] Ativar/desativar serviço
- [ ] Definir preço do serviço
- [ ] Ordenação de serviços

---

## 4️⃣ AGENDAMENTOS (24 itens)

### Criar Agendamento
- [ ] Selecionar serviço funciona
- [ ] Datepicker exibe datas futuras apenas
- [ ] Horários disponíveis exibem baseado no staff
- [ ] Cálculo de preço correto
- [ ] Campo de endereço é obrigatório
- [ ] Autocomplete de endereço funciona (Mapbox)
- [ ] Localização do cliente é validada
- [ ] Notas adicionais podem ser adicionadas
- [ ] Confirmar agendamento
- [ ] Email de confirmação enviado

### Visualizar Agendamentos
- [ ] Cliente vê seus agendamentos
- [ ] Staff vê seus agendamentos
- [ ] Admin vê todos os agendamentos
- [ ] Filtrar por status (pending/confirmed/completed/cancelled)
- [ ] Ordenar por data
- [ ] Mostrar detalhes clicando
- [ ] Mostrar recibo do pagamento

### Gerenciar Agendamentos
- [ ] Cliente pode cancelar agendamento (se não começou)
- [ ] Staff pode marcar como concluído
- [ ] Admin pode atribuir staff manualmente
- [ ] Notificação ao cliente 24h antes
- [ ] Notificação ao staff 24h e 1h antes
- [ ] Rescheduling funciona
- [ ] Cancelamento gera reembolso

---

## 5️⃣ PAGAMENTOS (16 itens)

### Stripe Checkout
- [ ] Botão "Pagar" aparece no agendamento
- [ ] Redireção para Stripe funciona
- [ ] Valores em BRL (centavos)
- [ ] Email de cliente pré-preenchido
- [ ] Pagamento com cartão funciona
- [ ] 3D Secure funciona quando requerido
- [ ] Erro de cartão inválido exibido
- [ ] Sucesso de pagamento redirecionado

### PIX
- [ ] Opção de PIX disponível
- [ ] QR Code gerado corretamente
- [ ] Cópia e cola PIX funciona
- [ ] Webhook de PIX processa pagamentos
- [ ] Timeout de PIX (30 min) funcionando
- [ ] Reembolso PIX funciona

### Recibos
- [ ] Email de recibo enviado após pagamento
- [ ] Recibo exibido em PDF
- [ ] Dados de transação corretos

---

## 6️⃣ AVALIAÇÕES & REVIEWS (12 itens)

### Deixar Review
- [ ] Cliente consegue deixar review após agendamento completado
- [ ] Rating 1-5 estrelas obrigatório
- [ ] Comentário opcional
- [ ] Fotos podem ser anexadas (opcional)
- [ ] Categorias de avaliação (limpeza, pontualidade, etc)
- [ ] Review aparece no perfil do staff

### Moderação
- [ ] Reviews aparecem com aprovação do admin
- [ ] Admin pode rejeitar review inapropriado
- [ ] Rating médio atualiza após novo review
- [ ] Reviews podem ser reportados
- [ ] Staff pode responder a reviews
- [ ] Histórico de reviews é exibido

---

## 7️⃣ REAL-TIME & NOTIFICAÇÕES (14 itens)

### Chat (Socket.IO)
- [ ] Cliente consegue enviar mensagem para staff
- [ ] Mensagem aparece em tempo real
- [ ] Status "online/offline" do staff exibido
- [ ] Histórico de chat é salvo
- [ ] Notificação de nova mensagem (navegador/email)
- [ ] Emoji suportados
- [ ] Fotos podem ser enviadas

### Email Transacional
- [ ] Welcome email após registro
- [ ] Confirmação de agendamento
- [ ] Notificação 24h antes
- [ ] Notificação 1h antes
- [ ] Recibo de pagamento
- [ ] Cancelamento confirmado
- [ ] Link de reset de senha funciona

---

## 8️⃣ LOCALIZAÇÃO & MAPAS (10 itens)

### Geolocalização
- [ ] Autocomplete de endereço (Mapbox)
- [ ] Resultado de busca exato
- [ ] Latitude/longitude calculadas corretamente
- [ ] Validação de endereço na área de atendimento
- [ ] Mapa exibindo localização do agendamento
- [ ] Distância calculada em km
- [ ] Sugestão de staff baseada em proximidade
- [ ] Validação de CEP

### Integração
- [ ] Mapbox API respondendo
- [ ] Rate limiting não atingido
- [ ] Fallback para entrada manual se API falha

---

## 9️⃣ PERFORMANCE & SEGURANÇA (15 itens)

### Performance
- [ ] Homepage carrega em < 3s
- [ ] API responde em < 500ms
- [ ] Pagination funciona (não carregar tudo)
- [ ] Imagens otimizadas (lazy loading)
- [ ] Cache de browser habilitado
- [ ] Minificação de JS/CSS

### Segurança
- [ ] HTTPS funciona em todas páginas
- [ ] Headers de segurança configurados (CSP, X-Frame-Options)
- [ ] SQL Injection protegido
- [ ] XSS protegido
- [ ] CORS configurado corretamente
- [ ] Rate limiting ativo (brute force)
- [ ] Senhas hasheadas com argon2
- [ ] Tokens JWT com expiração
- [ ] Dados sensíveis não expostos em logs

---

## 🔧 TESTES TÉCNICOS (Automação)

### Unit Tests
```bash
npm run test:unit
```
- [ ] Backend: 85+ testes
- [ ] Frontend: 50+ testes
- [ ] Coverage: > 80%

### Integration Tests
```bash
npm run test:integration
```
- [ ] API endpoints funcionando
- [ ] Database queries corretas

### E2E Tests
```bash
npm run test:e2e
```
- [ ] Fluxo completo de registro
- [ ] Fluxo completo de agendamento
- [ ] Fluxo de pagamento (Stripe test mode)
- [ ] Fluxo de cancelamento

### Load Testing (k6)
```bash
k6 run scripts/load-test.js
```
- [ ] 100 usuários simultâneos
- [ ] Resposta média < 500ms
- [ ] Taxa de erro < 1%

---

## 📱 RESPONSIVIDADE

### Desktop (1920x1080+)
- [ ] Layout correto
- [ ] Botões clicáveis
- [ ] Sem scroll horizontal

### Tablet (768px - 1024px)
- [ ] Navigation adaptada
- [ ] Touch-friendly buttons
- [ ] Responsive grid

### Mobile (320px - 767px)
- [ ] Menu mobile funciona
- [ ] Imagens escaladas
- [ ] Sem quebra de layout
- [ ] Botões de ação acessíveis
- [ ] Formulários usáveis

---

## 🌐 NAVEGADORES

- [ ] Chrome (desktop)
- [ ] Firefox (desktop)
- [ ] Safari (desktop + iOS)
- [ ] Edge (desktop)
- [ ] Chrome (mobile Android)
- [ ] Safari (mobile iOS)

---

## 📊 ANALÍTICA

- [ ] Google Analytics 4 rastreando eventos
- [ ] Conversões de pagamento rastreadas
- [ ] Funil de registro rastreado
- [ ] Eventos de busca rastreados

---

## 🎯 REQUISITOS FUNCIONAIS CRÍTICOS

| Sistema | Status | Prioridade | Verificado |
|---------|--------|-----------|-----------|
| Autenticação | ✅ | 🔴 Crítica | [ ] |
| Agendamentos | ✅ | 🔴 Crítica | [ ] |
| Pagamentos | ✅ | 🔴 Crítica | [ ] |
| Email | ✅ | 🟠 Alta | [ ] |
| Chat | ✅ | 🟠 Alta | [ ] |
| Reviews | ✅ | 🟡 Média | [ ] |
| Localização | ✅ | 🟡 Média | [ ] |
| Analytics | ✅ | 🟡 Média | [ ] |

---

## 📋 RESULTADO FINAL

**Data do teste:** ___________  
**Testador:** _______________  
**Status:** [ ] PASS [ ] FAIL  

### Defeitos encontrados:
1. _________________________________
2. _________________________________
3. _________________________________

### Observações:
_________________________________

---

✅ **CHECKLIST COMPLETO = PRONTO PARA PRODUÇÃO**
