import React from 'react';
import { render, screen } from '@testing-library/react';
import ServiceCard from '../ServiceCard';
import I18nProvider from '@/i18n/I18nProvider';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

const service = {
  id: 's1',
  name: 'Limpeza Básica',
  description: 'Limpeza rápida e eficiente',
  basePrice: 120,
  durationMinutes: 60,
  category: 'Residencial',
  isActive: true,
};

describe('ServiceCard', () => {
  it('renderiza informações do serviço', () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ServiceCard service={service as any} />
          </NotificationProvider>
        </ThemeProvider>
      </I18nProvider>
    );

    expect(screen.getByText(/Limpeza Básica/i)).toBeInTheDocument();
    expect(screen.getByText(/Limpeza rápida e eficiente/i)).toBeInTheDocument();
    expect(screen.getByText(/R\$ 120/i)).toBeInTheDocument();
    expect(screen.getByText(/60 min/i)).toBeInTheDocument();
    // link should exist
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/services/s1');
  });

  it('shows rating when provided', () => {
    render(
      <I18nProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ServiceCard service={service as any} rating={4.2} reviewCount={5} />
          </NotificationProvider>
        </ThemeProvider>
      </I18nProvider>
    );
    expect(screen.getByText(/4\.2/)).toBeInTheDocument();
    expect(screen.getByText(/\(5\)/)).toBeInTheDocument();
  });
});
