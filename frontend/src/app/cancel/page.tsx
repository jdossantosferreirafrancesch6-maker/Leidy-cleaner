"use client";

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CancelPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/bookings');
    }, 3000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-yellow-50">
      <div className="max-w-md text-center p-8 bg-white rounded shadow-lg">
        <h1 className="text-2xl font-bold text-yellow-700 mb-4">Pagamento cancelado</h1>
        <p className="text-gray-600 mb-6">
          Parece que você cancelou o pagamento. Você será redirecionado para seus agendamentos.
        </p>
        <p className="text-sm text-gray-500">
          Se a navegação não ocorrer automaticamente, clique{' '}
          <a href="/bookings" className="text-blue-600 underline">aqui</a>.
        </p>
      </div>
    </div>
  );
}
