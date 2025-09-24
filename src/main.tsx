import { StrictMode, version as reactVersion } from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';
import AppThemeProvider from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: { 
    queries: { refetchOnWindowFocus: false } 
  }
});

console.log('[BOOT]', {
  react: reactVersion ?? 'unknown',
  env: import.meta?.env?.MODE
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Root element not found');

ReactDOM.createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </AppThemeProvider>
    </QueryClientProvider>
  </StrictMode>
);
