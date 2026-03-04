"use client";

import React, { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';

function SuccessPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const bookingId = params?.get('bookingId');

  useEffect(() => {
    // after a short delay navigate back to either booking detail or dashboard
    const timer = setTimeout(() => {
      if (bookingId) {
        router.push(`/bookings/${bookingId}?paid=true`);
      } else {
        router.push('/bookings');
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [bookingId, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-50">
      <div className="max-w-md text-center p-8 bg-white rounded shadow-lg">
        <h1 className="text-2xl font-bold text-green-700 mb-4">Pagamento concluído!</h1>
        <p className="text-gray-600 mb-6">
          Obrigado! Você será redirecionado em alguns segundos.
        </p>
        <p className="text-sm text-gray-500">
          Se a navegação não ocorrer automaticamente, clique{' '}
          <a
            href={bookingId ? `/bookings/${bookingId}` : '/bookings'}
            className="text-blue-600 underline"
          >aqui</a>.
        </p>
      </div>
    </div>
  );
}

export default dynamic(() => Promise.resolve(SuccessPageContent), {
  ssr: false,
});
