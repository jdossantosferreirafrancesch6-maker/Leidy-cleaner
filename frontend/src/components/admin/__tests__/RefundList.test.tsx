import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RefundList from '../RefundList';
import { apiClient } from '@/services/api';

jest.mock('@/services/api');
const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

describe('RefundList Component', () => {
  const mockRefunds = [
    {
      id: 'booking-1',
      user_id: 'user-1',
      service_id: 'service-1',
      total_price: 100.00,
      payment_status: 'refunded',
      scheduled_date: '2026-03-04T10:00:00Z',
      created_at: '2026-03-01T09:00:00Z',
      updated_at: '2026-03-04T15:30:00Z',
      service_name: 'Limpeza Residencial',
      user_email: 'customer@test.com',
      user_name: 'João Silva'
    },
    {
      id: 'booking-2',
      user_id: 'user-2',
      service_id: 'service-1',
      total_price: 250.00,
      payment_status: 'refunded',
      scheduled_date: '2026-03-05T14:00:00Z',
      created_at: '2026-03-02T10:00:00Z',
      updated_at: '2026-03-05T16:00:00Z',
      service_name: 'Limpeza Comercial',
      user_email: 'autre@test.com',
      user_name: 'Maria Santos'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load and display refunds list', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: mockRefunds,
      count: 2
    });

    render(<RefundList />);

    await waitFor(() => {
      // Check once the API was called
      expect(mockedApi.getAdminRefunds).toHaveBeenCalled();
    });

    // Wait for data to load and appear
    await waitFor(() => {
      expect(screen.queryByText('Carregando refunds...')).not.toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Limpeza Residencial')).toBeInTheDocument();
    });

    expect(screen.getByText('Limpeza Comercial')).toBeInTheDocument();
    expect(screen.getByText('Maria Santos')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    mockedApi.getAdminRefunds.mockImplementation(() => new Promise(() => {})); // Never resolves

    render(<RefundList />);
    expect(screen.getByText('Carregando refunds...')).toBeInTheDocument();
  });

  it('should display error message on API failure', async () => {
    const errorMsg = 'Erro ao carregar refunds';
    mockedApi.getAdminRefunds.mockRejectedValue(new Error(errorMsg));

    render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText(errorMsg)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should show empty state when no refunds', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: [],
      count: 0
    });

    render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText('Nenhum refund encontrado.')).toBeInTheDocument();
    });
  });

  it('should filter refunds by date range', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: mockRefunds,
      count: 2
    });

    render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText('Limpeza Residencial')).toBeInTheDocument();
    });

    // Simulate date filtering
    const startDateInput = screen.getByPlaceholderText('Data inicial') as HTMLInputElement;
    const endDateInput = screen.getByPlaceholderText('Data final') as HTMLInputElement;
    const filterButton = screen.getByText('Filtrar');

    fireEvent.change(startDateInput, { target: { value: '2026-03-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-03-05' } });
    fireEvent.click(filterButton);

    await waitFor(() => {
      expect(mockedApi.getAdminRefunds).toHaveBeenCalledWith('2026-03-01', '2026-03-05');
    });
  });

  it('should show refund detail when clicking "Ver Detalhes"', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: mockRefunds,
      count: 2
    });

    const refundDetail = {
      ...mockRefunds[0],
      address: 'Rua da Limpeza',
      notes: 'Refund processado com sucesso'
    };

    mockedApi.getAdminRefundDetail.mockResolvedValue(refundDetail);

    render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText('Limpeza Residencial')).toBeInTheDocument();
    });

    const detailButtons = screen.getAllByText('Ver Detalhes');
    fireEvent.click(detailButtons[0]);

    await waitFor(() => {
      expect(mockedApi.getAdminRefundDetail).toHaveBeenCalledWith('booking-1');
      expect(screen.getByText('Detalhes do Refund')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('should clear filters and reload data', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: mockRefunds,
      count: 2
    });

    const { rerender } = render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText('Limpeza Residencial')).toBeInTheDocument();
    });

    const startDateInput = screen.getByPlaceholderText('Data inicial') as HTMLInputElement;
    const endDateInput = screen.getByPlaceholderText('Data final') as HTMLInputElement;
    const clearButton = screen.getByText('Limpar');

    fireEvent.change(startDateInput, { target: { value: '2026-03-01' } });
    fireEvent.change(endDateInput, { target: { value: '2026-03-05' } });

    await waitFor(() => {
      expect(startDateInput.value).toBe('2026-03-01');
      expect(endDateInput.value).toBe('2026-03-05');
    });

    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(mockedApi.getAdminRefunds).toHaveBeenCalledWith(undefined, undefined);
      // After clearing, the inputs should be cleared
      const newStartInput = screen.getByPlaceholderText('Data inicial') as HTMLInputElement;
      const newEndInput = screen.getByPlaceholderText('Data final') as HTMLInputElement;
      expect(newStartInput.value).toBe('');
      expect(newEndInput.value).toBe('');
    });
  });

  it('should display correct formatted prices', async () => {
    mockedApi.getAdminRefunds.mockResolvedValue({
      refunds: mockRefunds,
      count: 2
    });

    render(<RefundList />);

    await waitFor(() => {
      expect(screen.getByText(/R\$ 100\.00/)).toBeInTheDocument();
      expect(screen.getByText(/R\$ 250\.00/)).toBeInTheDocument();
    });
  });
});
