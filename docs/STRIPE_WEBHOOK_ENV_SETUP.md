# Configuração Stripe: Webhook e Variáveis de Ambiente

Este guia explica como configurar as variáveis de ambiente necessárias para usar o Stripe no projeto, como registrar um webhook e como testar localmente usando o Stripe CLI.

Obs: o backend já contém implementação para verificar assinatura do webhook quando a variável `STRIPE_WEBHOOK_SECRET` estiver presente. O endpoint esperado é `/api/v1/payments/webhook`.

## Variáveis de ambiente

- `STRIPE_SECRET_KEY` — chave secreta da API Stripe (ex.: `sk_test_...`). Usada para criar sessões e chamar a API Stripe.
- `STRIPE_WEBHOOK_SECRET` — secret usado para verificar assinaturas HMAC dos webhooks (ex.: `whsec_...`). Opcional em desenvolvimento, recomendado em staging/produção.

### Exemplo (Linux/macOS)
```bash
# Export temporário no shell
export STRIPE_SECRET_KEY=sk_test_xxx
export STRIPE_WEBHOOK_SECRET=whsec_xxx

# ou adicionar ao .env (produçao/staging):
# STRIPE_SECRET_KEY=sk_live_xxx
# STRIPE_WEBHOOK_SECRET=whsec_live_xxx
```

## Registrar e validar webhook com Stripe CLI (recomendado para dev local)

1. Instale o Stripe CLI: https://stripe.com/docs/stripe-cli

2. Autentique o CLI (uma vez):
```bash
stripe login
```

3. Inicie seu backend local (ex.: `npm run dev` no diretório `backend`). Garanta que o backend esteja acessível em `http://localhost:3000` (ou ajuste a URL abaixo).

4. No terminal, rode o Stripe CLI para encaminhar eventos para o seu endpoint:
```bash
stripe listen --forward-to http://localhost:3000/api/v1/payments/webhook
```
Ao iniciar, o Stripe CLI exibirá uma linha contendo o `Webhook secret` (algo como `whsec_...`). Copie esse valor.

5. Configure a variável de ambiente `STRIPE_WEBHOOK_SECRET` com o valor exibido pelo Stripe CLI (localmente ou em seu ambiente de testes):
```bash
export STRIPE_WEBHOOK_SECRET=whsec_retorno_do_stripe_cli
```

6. Gere eventos de teste usando o Stripe CLI (ex.: simular checkout completed):
```bash
# Simula um evento checkout.session.completed
stripe trigger checkout.session.completed
```
O Stripe CLI enviará o evento ao seu endpoint e você verá logs no backend. Se sua rota estiver correta e `STRIPE_WEBHOOK_SECRET` definida, a verificação de assinatura será realizada.

> Dica: Para testar um webhook com metadata (ex.: `bookingId`) você pode criar manualmente um objeto e enviar via `curl`, ou criar uma sessão de checkout no modo teste usando a API e então usar `stripe trigger`/`stripe events` para reproduzir.

## Teste manual via curl (sem assinatura)

Em ambientes de teste onde `STRIPE_WEBHOOK_SECRET` não está configurada, o backend aceita JSON parseado — útil para testes rápidos:

```bash
curl -X POST http://localhost:3000/api/v1/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "checkout.session.completed",
    "data": { "object": { "metadata": { "bookingId": "<SEU_BOOKING_ID>" } } }
  }'
```

Isso deve retornar `200` e, se o `bookingId` existir, o backend marcará o booking como pago.

## Produção

- Sempre use `STRIPE_SECRET_KEY` real (`sk_live_...`) em produção.
- Registre o webhook no painel do Stripe apontando para a URL pública do seu backend, e copie o `Signing secret` (whsec_...) para `STRIPE_WEBHOOK_SECRET` no ambiente de produção.
- Garanta que o endpoint de webhook esteja servido via HTTPS.
- Não exponha a `STRIPE_SECRET_KEY` em logs ou em cliente.

## Notas sobre o projeto

- O backend constrói `success_url` usando o cabeçalho `Origin` da requisição para o endpoint de `checkout`. Em ambientes reais, garanta que o navegador envie o `Origin` correto (normalmente automático). O `success_url` gerado é `${origin}/success?session_id={CHECKOUT_SESSION_ID}&bookingId=${bookingId}`.
- Já existem páginas de frontend para `success` (`/success`) e `cancel` (`/cancel`) em `frontend/src/app/`.

## Como depurar problemas comuns

- Recebe 400 Webhook Error: verifique o log do backend — provavelmente a verificação de assinatura falhou. Confirme `STRIPE_WEBHOOK_SECRET`.
- Backend não recebe eventos: certifique-se que o Stripe CLI está rodando (`stripe listen`) ou que o webhook no dashboard está ativo e apontando para a URL correta.
- Evento recebido mas booking não atualizado: cheque se o `metadata.bookingId` foi incluído na sessão de checkout criada; veja logs do backend.

## Recursos

- Stripe CLI: https://stripe.com/docs/stripe-cli
- Webhooks: https://stripe.com/docs/webhooks
- Checkout: https://stripe.com/docs/payments/checkout

---

Se quiser, eu já posso:  
- (A) adicionar instruções específicas para `docker-compose`/deploy,  
- (B) implementar o teste E2E (Playwright) que cobre checkout → success → verificação do booking.

Qual deles prefere que eu faça a seguir? (A/B)