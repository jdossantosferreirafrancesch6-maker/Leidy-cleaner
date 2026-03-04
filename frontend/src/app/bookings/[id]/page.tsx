"use client";

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { apiClient, Booking, Review } from '@/services/api';
import ReviewForm from '@/components/ReviewForm';

export default function BookingDetail() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [booking, setBooking] = useState<Booking | null>(null);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  useEffect(() => {
    if (!id) return;
    apiClient.getBookingById(id)
      .then((b) => setBooking(b))
      .catch((err) => setError(err.message || 'Erro ao carregar booking'))
      .finally(() => setIsInitialLoad(false));
  }, [id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') === 'true') {
      setSuccess('Pagamento realizado com sucesso!');
    }
  }, []);

  useEffect(() => {
    if (!id) return;
    apiClient.getBookingReviews(id)
      .then((res) => {
        if (res.reviews.length > 0) {
          setReview(res.reviews[0]);
        }
      })
      .catch(() => {
        // ignore
      });
  }, [id]);

  if (isInitialLoad) return <p>Carregando...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  if (!booking) return <p>Booking não encontrado.</p>;

  return (
    <div className="max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-2">Detalhes do Agendamento</h2>
      {success && <p className="text-green-500 mb-4">{success}</p>}
      <p><strong>Serviço:</strong> {booking.serviceName || booking.serviceId}</p>
      <p><strong>Data:</strong> {new Date(booking.scheduledDate).toLocaleString()}</p>
      {booking.address && <p><strong>Endereço:</strong> {booking.address}</p>}
      {booking.notes && <p><strong>Notas:</strong> {booking.notes}</p>}
      <p><strong>Preço total:</strong> R$ {booking.totalPrice.toFixed(2)}</p>
      <p><strong>Status:</strong> {booking.status}</p>
      {booking.paymentStatus && <p><strong>Pagamento:</strong> {booking.paymentStatus}</p>}
      <p><strong>Criado em:</strong> {new Date(booking.createdAt).toLocaleString()}</p>
      <div className="mt-4 space-x-2 flex flex-wrap gap-2">
        {booking.status === 'pending' && (
          <a href={`/payments?bookingId=${booking.id}`} className="inline-block bg-green-600 text-white px-4 py-2 rounded">
            Pagar agora
          </a>
        )}
        {booking.paymentStatus === 'paid' && (
          <button
            onClick={async () => {
              try {
                setLoading(true);
                const result = await apiClient.refundBooking(booking.id);
                setBooking(result.booking);
                setSuccess('Reembolso solicitado com sucesso!');
              } catch (err: any) {
                setError(err.message || 'Erro ao solicitar reembolso');
              } finally {
                setLoading(false);
              }
            }}
            className="inline-block bg-yellow-600 text-white px-4 py-2 rounded disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Processando...' : 'Solicitar Reembolso'}
          </button>
        )}
        {(booking.status === 'pending' || booking.status === 'confirmed') && booking.paymentStatus !== 'refunded' && (
          <button
            onClick={async () => {
              try {
                await apiClient.client.delete(`/bookings/${booking.id}`);
                router.push('/bookings');
              } catch (err: any) {
                setError(err.message || 'Erro ao cancelar booking');
              }
            }}
            className="inline-block bg-red-500 text-white px-4 py-2 rounded">
            Cancelar
          </button>
        )}
      </div>
      {/* review section */}
      <div className="mt-6">
        <h3 className="text-xl font-semibold mb-2">Avaliação</h3>
        {review ? (
          <div className="border p-3 rounded">
            <p className="font-semibold">{review.rating} ⭐</p>
            {review.comment && <p>"{review.comment}"</p>}
          </div>
        ) : booking.status === 'confirmed' || booking.status === 'completed' ? (
          <ReviewForm
            bookingId={booking.id}
            onSubmitted={(r) => setReview(r)}
          />
        ) : (
          <p>Você pode avaliar após o serviço ser confirmado.</p>
        )}
      </div>
    </div>
  );
}
