"use client";

import React, { useState, useEffect } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient, Booking } from '@/services/api';

export default function ClientPayments() {
  const [message, setMessage] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [showQrCode, setShowQrCode] = useState(false);
  const searchParams = useSearchParams();
  const bookingId = searchParams?.get('bookingId') || undefined;
  const router = useRouter();

  useEffect(() => {
    if (bookingId) {
      apiClient.getBookingById(bookingId)
        .then((b) => setBooking(b))
        .catch(() => setMessage('Não foi possível carregar o agendamento'));
    }
  }, [bookingId]);

  const stripeKey = process.env.NEXT_PUBLIC_STRIPE_KEY;

  const handlePixPay = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('Gerando PIX...');
    try {
      if (bookingId) {
        const res = await apiClient.createPixPayment(bookingId);
        setQrCode(res.qrCode);
        setPixKey(res.pixKey);
        setPaymentAmount(res.amount);
        setShowQrCode(true);
        setMessage('PIX gerado com sucesso! Escaneie o QR code ou copie a chave PIX.');
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro ao gerar PIX. Tente novamente.');
    }
  };

  const handleCardPay = async () => {
    if (!bookingId) return;
    try {
      const resp = await apiClient.checkoutBooking(bookingId);
      if (resp.url) {
        window.location.href = resp.url;
        return;
      }
      // fallback updated booking
      setBooking(resp.booking || null);
      setMessage('Pagamento processado com sucesso!');
    } catch (err: any) {
      setMessage(err.message || 'Erro ao processar pagamento com cartão.');
    }
  };

  const handleConfirmPayment = async () => {
    setMessage('Confirmando pagamento...');
    try {
      if (bookingId) {
        const res = await apiClient.confirmPixPayment(bookingId);
        if (res.success) {
          setMessage('Pagamento confirmado! Redirecionando...');
          setTimeout(() => router.push(`/bookings/${bookingId}`), 2000);
        }
      }
    } catch (err: any) {
      setMessage(err.message || 'Erro ao confirmar pagamento. Tente novamente.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setMessage('Chave PIX copiada para a área de transferência!');
  };

  return (
    <ProtectedRoute role="customer">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Pagamento PIX</h1>
        <p className="mb-4 text-gray-600">Pagamento seguro via PIX</p>
        {booking && (
          <div className="mb-4 p-3 border rounded bg-gray-50">
            <p><strong>Agendamento:</strong> {booking.id}</p>
            <p><strong>Serviço:</strong> {booking.serviceName || booking.serviceId}</p>
            <p><strong>Preço:</strong> R$ {booking.totalPrice.toFixed(2)}</p>
            <p><strong>Status:</strong> {booking.status}</p>
          </div>
        )}
        {!showQrCode ? (
          <div className="space-y-3 bg-white p-4 rounded shadow">
            {stripeKey && (
              <button
                onClick={handleCardPay}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700 mb-2"
              >
                Pagar com Cartão
              </button>
            )}
            <form onSubmit={handlePixPay} className="space-y-3">
              <button className="w-full bg-green-600 text-white px-4 py-2 rounded font-semibold hover:bg-green-700">
                Gerar PIX
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3 bg-white p-4 rounded shadow">
            <div className="text-center">
              <p className="font-semibold mb-2">Valor: R$ {paymentAmount.toFixed(2)}</p>
              <div className="mb-4">
                <img src={`data:image/png;base64,${qrCode}`} alt="QR Code PIX" className="mx-auto border rounded" />
              </div>
              <p className="text-sm text-gray-600 mb-2">Ou copie a chave PIX:</p>
              <button
                onClick={() => copyToClipboard(pixKey)}
                className="text-xs bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
              >
                {pixKey}
              </button>
            </div>
            <button
              onClick={handleConfirmPayment}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded font-semibold hover:bg-blue-700"
            >
              Confirmar Pagamento
            </button>
          </div>
        )}
        {message && (
          <div className={`mt-4 p-3 rounded border text-sm ${message.toLowerCase().includes('erro') ? 'bg-red-100 border-red-300 text-red-700' : message.toLowerCase().includes('processando') ? 'bg-yellow-50 border-yellow-200 text-yellow-800' : 'bg-green-50 border-green-200 text-green-800'}`}>
            {message}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
