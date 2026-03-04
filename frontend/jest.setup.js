import '@testing-library/jest-dom';
import './src/i18n/i18n'; // initialize i18n for tests

// polyfill window.matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: query === '(prefers-color-scheme: dark)' ? false : true,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// mock Next.js app router hooks for tests
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), pathname: '/' }),
  useSearchParams: () => ({ get: (key) => null }),
}));

// polyfill alert
window.alert = jest.fn();

// optionally extend render with providers (components can import helpers if needed)
import { render as rtlRender } from '@testing-library/react';
import { ThemeProvider } from './src/contexts/ThemeContext';
import I18nProvider from './src/i18n/I18nProvider';

function render(ui, options) {
  return rtlRender(
    <I18nProvider>
      <ThemeProvider>{ui}</ThemeProvider>
    </I18nProvider>,
    options
  );
}

// re-export everything
export * from '@testing-library/react';
export { render };

