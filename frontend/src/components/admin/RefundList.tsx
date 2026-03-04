"use client";

import React, { useEffect, useState } from 'react';
import { apiClient } from '@/services/api';

interface Refund {
  id: string;
  user_id: string;
  service_id: string;
  total_price: number;
  payment_status: string;
  scheduled_date: string;
  created_at: string;
  updated_at: string;
  service_name?: string;
  user_email?: string;
  user_name?: string;
}

export default function RefundList() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const load = async (start?: string, end?: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.getAdminRefunds(start, end);
      setRefunds(res.refunds || []);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar refunds');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFilter = () => {
    load(startDate, endDate);
  };

  const handleViewDetail = async (refund: Refund) => {
    try {
      const detail = await apiClient.getAdminRefundDetail(refund.id);
      setSelectedRefund(detail);
      setShowDetail(true);
    } catch (err: any) {
      alert('Erro ao carregar detalhes: ' + err.message);
    }
  };

  if (loading) {
    return <p className="text-gray-500">Carregando refunds...</p>;
  }
  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-gray-50 p-4 rounded border">
        <h3 className="font-bold mb-3">Filtrar por período</h3>
        <div className="flex gap-2 mb-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 border rounded"
            placeholder="Data inicial"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 border rounded"
            placeholder="Data final"
          />
          <button
            onClick={handleFilter}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Filtrar
          </button>
          <button
            onClick={() => {
              setStartDate('');
              setEndDate('');
              load();
            }}
            className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* List or Detail View */}
      {showDetail && selectedRefund ? (
        <div className="bg-white border rounded p-6">
          <button
            onClick={() => setShowDetail(false)}
            className="mb-4 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Voltar
          </button>

          <h2 className="text-2xl font-bold mb-4">Detalhes do Refund</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="text-gray-600 text-sm">ID da Reserva</p>
              <p className="font-bold">{selectedRefund.id}</p>
            </div>

            <div className="border-l-4 border-green-600 pl-4">
              <p className="text-gray-600 text-sm">Serviço</p>
              <p className="font-bold">{selectedRefund.service_name}</p>
            </div>

            <div className="border-l-4 border-purple-600 pl-4">
              <p className="text-gray-600 text-sm">Cliente</p>
              <p className="font-bold">{selectedRefund.user_name}</p>
              <p className="text-sm text-gray-500">{selectedRefund.user_email}</p>
            </div>

            <div className="border-l-4 border-yellow-600 pl-4">
              <p className="text-gray-600 text-sm">Valor</p>
              <p className="font-bold text-xl">R$ {selectedRefund.total_price?.toFixed(2)}</p>
            </div>

            <div className="border-l-4 border-red-600 pl-4">
              <p className="text-gray-600 text-sm">Status</p>
              <p className="font-bold text-red-600">{selectedRefund.payment_status}</p>
            </div>

            <div className="border-l-4 border-orange-600 pl-4">
              <p className="text-gray-600 text-sm">Data Agendada</p>
              <p className="font-bold">{new Date(selectedRefund.scheduled_date).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm">{new Date(selectedRefund.scheduled_date).toLocaleTimeString('pt-BR')}</p>
            </div>

            <div className="border-l-4 border-indigo-600 pl-4">
              <p className="text-gray-600 text-sm">Data do Refund</p>
              <p className="font-bold">{new Date(selectedRefund.updated_at).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm">{new Date(selectedRefund.updated_at).toLocaleTimeString('pt-BR')}</p>
            </div>

            <div className="border-l-4 border-cyan-600 pl-4">
              <p className="text-gray-600 text-sm">Data de Criação</p>
              <p className="font-bold">{new Date(selectedRefund.created_at).toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              💡 <strong>Nota:</strong> Este refund foi processado e o cliente deve ter recebido o valor em sua conta.
            </p>
          </div>
        </div>
      ) : refunds.length === 0 ? (
        <p className="text-center text-gray-500 py-8">Nenhum refund encontrado.</p>
      ) : (
        <div className="overflow-auto">
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border text-left">ID</th>
                <th className="p-2 border text-left">Cliente</th>
                <th className="p-2 border text-left">Serviço</th>
                <th className="p-2 border text-right">Valor</th>
                <th className="p-2 border text-left">Status</th>
                <th className="p-2 border text-left">Data Agendada</th>
                <th className="p-2 border text-left">Data Refund</th>
                <th className="p-2 border text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-gray-50 border-b">
                  <td className="p-2 border text-xs font-mono">{refund.id.substring(0, 8)}...</td>
                  <td className="p-2 border">
                    <div className="text-sm">{refund.user_name}</div>
                    <div className="text-xs text-gray-500">{refund.user_email}</div>
                  </td>
                  <td className="p-2 border">{refund.service_name}</td>
                  <td className="p-2 border text-right font-bold">R$ {refund.total_price?.toFixed(2)}</td>
                  <td className="p-2 border">
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-bold">
                      {refund.payment_status.toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2 border text-xs">
                    {new Date(refund.scheduled_date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-2 border text-xs">
                    {new Date(refund.updated_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-2 border text-center">
                    <button
                      onClick={() => handleViewDetail(refund)}
                      className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="text-gray-600 text-sm mt-4">
        Total de refunds: <strong>{refunds.length}</strong>
      </div>
    </div>
  );
}
