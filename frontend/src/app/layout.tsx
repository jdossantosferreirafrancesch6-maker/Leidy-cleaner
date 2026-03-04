import './globals.css';
import React from 'react';
import type { Metadata } from 'next';
import { ReactNode } from 'react';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AdvancedThemeProvider } from '@/contexts/AdvancedThemeContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import NotificationBanner from '@/components/NotificationBanner';
import CookieBanner from '@/components/CookieBanner';
import Chatbot from '@/components/Chatbot';
import I18nProvider from '@/i18n/I18nProvider';

export const metadata: Metadata = {
  title: 'Leidy Cleaner - Limpeza Profissional',
  description: 'Serviços de limpeza profissional para residências e empresas. Agende agora mesmo!',
  icons: {
    icon: [
      { url: '/leidy-logo.png' },
      { url: '/logo.svg', type: 'image/svg+xml' }
    ],
    apple: '/leidy-logo.png',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
          {/* Favicon */}
          <link rel="icon" href="/leidy-logo.png" />
          <link rel="apple-touch-icon" href="/leidy-logo.png" />
          {/* Google Analytics */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer = window.dataLayer || []; function gtag(){dataLayer.push(arguments);} gtag('js', new Date()); gtag('config', 'G-XXXXXXXXXX');` }} />
      </head>
      <body>
        <AdvancedThemeProvider>
          <ThemeProvider>
            <AuthProvider>
              <NotificationProvider>
                <I18nProvider>
                  <Navbar />
                  <CookieBanner />
                  <main className="min-h-screen">{children}</main>
                  <Chatbot />
                </I18nProvider>
              </NotificationProvider>
            </AuthProvider>
          </ThemeProvider>
        </AdvancedThemeProvider>
      </body>
    </html>
  );
}
