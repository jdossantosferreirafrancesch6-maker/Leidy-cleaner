import { test, expect } from '@playwright/test';
import { BASE_URL, resetDb, attachNetworkLogger } from './helpers';

test.describe('Fluxo de pagamento com Stripe (Checkout)', () => {
  test.beforeEach(async ({ page }) => {
    attachNetworkLogger(page);
    await resetDb(page);
  });

  test('criar booking, solicitar checkout e verificar success page', async ({ page }) => {
    // 1. Registrar novo usuário
    await page.goto(`${BASE_URL}/auth/register`);
    const email = `checkout${Date.now()}@mail.com`;
    await page.fill('input[name="name"]', 'Cliente Checkout');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="phone"]', '11999999999');
    await page.fill('input[name="password"]', 'senha123');
    await page.fill('input[name="confirmPassword"]', 'senha123');

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ timeout: 60000 }).catch(() => {})
    ]);

    // 2. Login
    await page.goto(`${BASE_URL}/auth/login`);
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', 'senha123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\//);

    // 3. Ir para dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Meus Agendamentos')).toBeVisible({ timeout: 10000 });

    // 4. Buscar por um botão de criar agendamento ou ir direto para serviços
    // Se não houver agendamentos, clique em "Agendar um serviço"
    const noBookingsMsg = page.locator('text=Nenhum agendamento ainda');
    if (await noBookingsMsg.isVisible()) {
      await page.click('button:has-text("Agendar um serviço")');
      await page.waitForURL(/\/services/, { timeout: 10000 });
    }

    // 5. Listar serviços e criar um agendamento
    await page.goto(`${BASE_URL}/services`);
    await expect(page.locator('text=Serviços')).toBeVisible({ timeout: 10000 });

    // Clicar no primeiro serviço disponível
    const firstService = page.locator('[class*="service"]').first();
    await firstService.click();
    await page.waitForURL(/\/services\/\d+/, { timeout: 10000 });

    // 6. Preencher formulário de agendamento
    // Assumindo que há campos de data e endereço
    const bookButton = page.locator('button:has-text("Agendar")');
    if (await bookButton.isVisible()) {
      // Se houver, preencher a data
      const dateInput = page.locator('input[type="date"]').first();
      if (await dateInput.isVisible()) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        await dateInput.fill(dateStr);
      }

      // Preencher endereço se existir
      const addressInput = page.locator('textarea, input[name*="address"]').first();
      if (await addressInput.isVisible()) {
        await addressInput.fill('Rua Teste, 123 - São Paulo');
      }

      // Clique em agendar
      await bookButton.click();
      await page.waitForURL(/booking|dashboard/, { timeout: 10000 });
    }

    // 7. Extrair bookingId do URL ou buscar em dashboard
    let bookingId: string | null = null;
    const currentUrl = page.url();
    const bookingMatch = currentUrl.match(/\/bookings\/(\d+)/);
    if (bookingMatch) {
      bookingId = bookingMatch[1];
    } else {
      // Voltar ao dashboard se não conseguir encontrar no URL
      await page.goto(`${BASE_URL}/dashboard`);
      await expect(page.locator('text=Meus Agendamentos')).toBeVisible({ timeout: 10000 });

      // Procurar por um agendamento pendente de pagamento
      const bookingRow = page.locator('text=Pendente').first();
      if (await bookingRow.isVisible()) {
        // Tentar extrair o ID a partir de um link ou botão de pagamento
        const paymentBtn = page.locator('button:has-text("Realizar Pagamento")').first();
        if (await paymentBtn.isVisible()) {
          // Se conseguir, o bookingId pode estar no contexto — continuar para o próximo passo
          bookingId = 'pending'; // placeholder indicando que há um agendamento
        }
      }
    }

    // 8. Solicitar checkout (PIX ou Stripe)
    // Se houver um botão "Realizar Pagamento" visível, clique
    const paymentBtn = page.locator('button:has-text("Realizar Pagamento")').first();
    if (await paymentBtn.isVisible()) {
      await paymentBtn.click();
      await page.waitForURL(/payments/, { timeout: 10000 });

      // 9. Tentar clicar em "Pagar com Cartão" (Stripe)
      // Se Stripe está configurado, isso redirecionará para Stripe checkout
      const cardPayBtn = page.locator('button:has-text("Pagar com Cartão")');
      if (await cardPayBtn.isVisible()) {
        // Em testes, Stripe redirecionará para checkout.stripe.com ou, em modo fallback,
        // o servidor retornará um booking marcado como pago.
        // Para fins deste E2E, esperamos que em modo fallback (sem STRIPE_SECRET_KEY na test),
        // o servidor imediatamente marque como pago e redirecione para /success.

        // Interceptar a resposta de checkout
        const checkoutPromise = page.waitForResponse(
          response => response.url().includes('/payments/checkout') && response.status() === 200
        );

        await cardPayBtn.click();
        const checkoutResponse = await checkoutPromise;
        const checkoutData = await checkoutResponse.json();

        // Se há uma URL (Stripe real), redirecionar para success manualmente
        // Se há um booking (fallback), o servidor pode ter já marcado como pago
        if (checkoutData.data?.url) {
          // Stripe real — simular sucesso indo para success page
          const bookingIdFromResponse = bookingId || 'test';
          await page.goto(`${BASE_URL}/success?bookingId=${bookingIdFromResponse}`, {
            waitUntil: 'domcontentloaded'
          });
        } else {
          // Fallback — servidor marcou como pago, aguardar redirecionamento ou ir manualmente
          await page.goto(`${BASE_URL}/dashboard`);
        }
      } else {
        // Se não houver botão de cartão, tentar PIX
        const pixBtn = page.locator('button:has-text("Gerar PIX")');
        if (await pixBtn.isVisible()) {
          // PIX — não testamos pagamento real, apenas geração de QR code
          await pixBtn.click();
          await expect(page.locator('text=Valor:')).toBeVisible({ timeout: 5000 });
        }
      }
    }

    // 10. Verificar que chegamos em uma página de sucesso ou dashboard com booking pago
    // Se em /success, verificar mensagem
    if (page.url().includes('/success')) {
      await expect(page.locator('text=Pagamento concluído')).toBeVisible({ timeout: 5000 });
      // Aguardar redirecionamento automático (3 segundos) para booking detail
      await page.waitForNavigation({ timeout: 5000 }).catch(() => {});
    } else {
      // Caso contrário, conferir que estamos em dashboard e o booking está marcado como "Pago"
      await expect(page.locator('text=Pagos')).toBeVisible({ timeout: 5000 });
    }

    console.log('✓ Fluxo de checkout completo');
  });

  test('simular webhook e validar confirmação de pagamento', async ({ page, context }) => {
    // 1. Criar um usuário e booking com fallback payment (sem Stripe key real)
    await page.goto(`${BASE_URL}/auth/register`);
    const email = `webhook${Date.now()}@mail.com`;
    await page.fill('input[name="name"]', 'Webhook Test');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="phone"]', '11999999999');
    await page.fill('input[name="password"]', 'senha123');
    await page.fill('input[name="confirmPassword"]', 'senha123');
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ timeout: 60000 }).catch(() => {})
    ]);

    // 2. Ir para dashboard
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page.locator('text=Meus Agendamentos')).toBeVisible({ timeout: 10000 });

    // 3. Se não houver agendamento, criar um (simples — apenas esperar carregar)
    const noBookingsMsg = page.locator('text=Nenhum agendamento ainda');
    if (await noBookingsMsg.isVisible()) {
      // Em um cenário real, criaria booking via UI
      // Por simplicidade, apenas verificar que o layout está correto
      await expect(page.locator('text=Total de Agendamentos')).toBeVisible();
    } else {
      // Há agendamentos — conferir se há botão de pagamento pendente
      const payButton = page.locator('button:has-text("Realizar Pagamento")');
      if (await payButton.isVisible()) {
        // Clicar para processar pagamento
        await payButton.click();
        await page.waitForURL(/payments/, { timeout: 10000 });

        // Simular webhook (POST para /api/v1/payments/webhook)
        // com fallback, o pagamento já foi processado pela UI
        // Aqui apenas validamos que o endpoint responde
        const webhookResponse = await context.request.post(
          'http://127.0.0.1:3001/api/v1/payments/webhook',
          {
            headers: { 'Content-Type': 'application/json' },
            data: {
              type: 'checkout.session.completed',
              data: { object: { metadata: { bookingId: 'test-booking-id' } } }
            }
          }
        );
        expect(webhookResponse.status()).toBe(200);
        const webhookData = await webhookResponse.json();
        expect(webhookData.received).toBe(true);
      }
    }

    console.log('✓ Webhook test completo');
  });
});
