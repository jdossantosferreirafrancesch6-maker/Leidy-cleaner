"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';
import ProtectedRoute from '@/components/ProtectedRoute';
import ServiceForm from './ServiceForm';
import ConfirmModal from '@/components/ConfirmModal';

const PAGE_SIZE = 10;

export default function AdminPage() {
  const [services, setServices] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [toDelete, setToDelete] = useState<any | null>(null);
  const [stats, setStats] = useState<{ users: number; services: number; bookings: number; pendingReviews?: number } | null>(null);

  const load = async () => {
    try {
      const res = await apiClient.getServices({ limit: 200 });
      setServices(res.services || []);
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    load();
    apiClient.getStats()
      .then((s) => setStats(s))
      .catch(() => {})
  }, []);

  const handleDelete = async (s: any) => {
    try {
      await apiClient.deleteService(String(s.id));
      await load();
      setToDelete(null);
    } catch (err) {
      alert('Erro ao excluir');
    }
  };

  return (
    <ProtectedRoute role="admin">
      <div>
        <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>
        {stats && (
          <div className="mb-4 p-3 bg-green-50 rounded">
            <p>Usuários: {stats.users}</p>
            <p>Serviços: {stats.services}</p>
            <p>Bookings: {stats.bookings}</p>
            <p>Avaliações pendentes: {stats.pendingReviews}</p>
          </div>
        )}
        <p className="mb-4">CRUD básico de serviços (apenas admin).</p>
        <p className="mb-4">
          <a href="/admin/reviews" className="text-blue-600 hover:underline">Gerenciar avaliações</a> |{' '}
          <a href="/admin/refunds" className="text-blue-600 hover:underline">Dashboard de Refunds</a>
        </p>

        <div className="mb-6">
          <h3 className="font-semibold mb-2">Criar / Editar Serviço</h3>
          <ServiceForm
            initial={editing}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
            onCancel={() => setEditing(null)}
          />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <input value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Buscar serviços" className="border p-2 rounded" />
          <button onClick={() => { setQuery(''); setPage(1); }} className="px-3 py-1 border rounded">Limpar</button>
        </div>

        <div className="space-y-2">
          {services.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).slice((page-1)*PAGE_SIZE, page*PAGE_SIZE).map((s) => (
            <div key={s.id} className="border p-3 rounded flex justify-between items-center">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-sm text-gray-500">{s.category} — R$ {s.basePrice}</p>
              </div>
              <div>
                <button onClick={() => setEditing(s)} className="mr-2 bg-yellow-400 px-3 py-1 rounded">Editar</button>
                <button onClick={() => setToDelete(s)} className="bg-red-500 text-white px-3 py-1 rounded">Excluir</button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-gray-600">Página {page}</div>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={() => setPage(p => Math.max(1, p-1))} className="px-3 py-1 border rounded">Anterior</button>
            <button disabled={(page*PAGE_SIZE) >= services.filter(s => s.name.toLowerCase().includes(query.toLowerCase())).length} onClick={() => setPage(p => p+1)} className="px-3 py-1 border rounded">Próxima</button>
          </div>
        </div>

        <ConfirmModal open={!!toDelete} title="Excluir serviço" message={`Excluir serviço "${toDelete?.name}"?`} onConfirm={() => toDelete && handleDelete(toDelete)} onCancel={() => setToDelete(null)} />
      </div>
    </ProtectedRoute>
  );
}
