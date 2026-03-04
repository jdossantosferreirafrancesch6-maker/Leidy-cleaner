"use client";

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { apiClient, Booking } from '@/services/api';
import { Calendar, MapPin, Clock, DollarSign, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  useEffect(() => {
    if (isAuthenticated) {
      loadBookings();
    }
  }, [isAuthenticated]);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.listMyBookings();
      setBookings(res.bookings || []);
    } catch (err) {
      console.error('Error loading bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (bookingId: string) => {
    try {
      const result = await apiClient.checkoutBooking(bookingId);
      // stripe may return a URL to redirect the user
      if (result.url) {
        window.location.href = result.url;
        return;
      }

      // otherwise we got back an updated booking (fallback mode)
      await loadBookings();
      alert('Pagamento processado com sucesso!');
    } catch (err) {
      console.error('Payment error:', err);
      alert('Erro ao processar pagamento');
    }
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/5 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Meus Agendamentos</h1>
          <p className="text-gray-600">Bem-vindo, {user?.name}! Aqui estão seus agendamentos.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total de Agendamentos</p>
                <p className="text-3xl font-bold text-primary mt-2">{bookings.length}</p>
              </div>
              <Calendar size={32} className="text-primary opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pagos</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {bookings.filter((b) => b.paymentStatus === 'paid').length}
                </p>
              </div>
              <CheckCircle size={32} className="text-green-500 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Pendentes</p>
                <p className="text-3xl font-bold text-yellow-600 mt-2">
                  {bookings.filter((b) => b.paymentStatus === 'unpaid').length}
                </p>
              </div>
              <AlertCircle size={32} className="text-yellow-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg mb-6">Nenhum agendamento ainda.</p>
            <Link href="/services">
              <button className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-600">
                Agendar um serviço
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">
                      {booking.serviceName || `Serviço #${booking.serviceId}`}
                    </h3>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <Calendar size={16} className="text-primary" />
                        <span>
                          {new Date(booking.scheduledDate).toLocaleDateString('pt-BR', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {booking.address && (
                        <div className="flex items-center gap-2">
                          <MapPin size={16} className="text-primary" />
                          <span>{booking.address}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <DollarSign size={16} className="text-primary" />
                        <span>R$ {booking.totalPrice}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {booking.status === 'confirmed'
                          ? 'Confirmado'
                          : booking.status === 'pending'
                            ? 'Pendente'
                            : 'Cancelado'}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          booking.paymentStatus === 'paid'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}
                      >
                        {booking.paymentStatus === 'paid' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>

                    {booking.paymentStatus === 'unpaid' && (
                      <button
                        onClick={() => handlePayment(booking.id)}
                        className="mt-2 bg-primary hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Realizar Pagamento
                      </button>
                    )}
                  </div>
                </div>

                {booking.notes && (
                  <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                    <p className="font-medium text-gray-700">Notas:</p>
                    <p>{booking.notes}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
