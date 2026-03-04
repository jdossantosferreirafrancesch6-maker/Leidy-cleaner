"use client";

import React from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import RefundList from '@/components/admin/RefundList';

export default function AdminRefundsPage() {
  return (
    <ProtectedRoute role="admin">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard de Refunds</h1>
          <p className="text-gray-600">
            Visualize e gerencie todos os refunds processados no sistema.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-sm text-blue-800">
            💰 <strong>Informação:</strong> Esta página mostra todos os reembolsos processados.
            Os clientes foram notificados automaticamente sobre seus refunds.
          </p>
        </div>

        <RefundList />
      </div>
    </ProtectedRoute>
  );
}
