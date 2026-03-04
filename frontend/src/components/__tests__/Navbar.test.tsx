import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '../Navbar';
import { AuthContext } from '@/contexts/AuthContext';
import { apiClient } from '@/services/api';
import I18nProvider from '@/i18n/I18nProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';

jest.mock('@/services/api');
const mockedApi = apiClient as jest.Mocked<typeof apiClient>;

function renderWithAuth(user: any) {
  render(
    <I18nProvider>
      <ThemeProvider>
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, loading: false, login: jest.fn(), register: jest.fn(), logout: jest.fn(), refresh: jest.fn() }}>
          <Navbar />
        </AuthContext.Provider>
      </ThemeProvider>
    </I18nProvider>
  );
}

describe('Navbar', () => {
  beforeEach(() => {
    mockedApi.getCompanyInfo.mockResolvedValue({ name: 'Limpar Plus', logoUrl: '/logo.svg' } as any);
  });

  it('shows basic links for anonymous users and logo', async () => {
    renderWithAuth(null);
    // logo should load
    expect(await screen.findByAltText(/Limpar Plus/i)).toBeInTheDocument();

    expect(screen.getByText(/Home/i)).toBeInTheDocument();
    expect(screen.getByText(/Serviços/i)).toBeInTheDocument();
    expect(screen.getByText(/Equipe/i)).toBeInTheDocument();
    expect(screen.getByText(/Entrar/i)).toBeInTheDocument();
  });

  it('shows admin links when user is admin', async () => {
    renderWithAuth({ id: 'u1', role: 'admin', name: 'Admin' });
    await screen.findByAltText(/Limpar Plus/i);
    const adminLinks = screen.getAllByText(/Admin/i);
    expect(adminLinks.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(adminLinks[0]);
    await screen.findByText(/Gerenciar Agendamentos/i);
    expect(screen.getByText(/Gerenciar Agendamentos/i)).toBeInTheDocument();
    expect(screen.getByText(/Avaliações/i)).toBeInTheDocument();
  });
});
