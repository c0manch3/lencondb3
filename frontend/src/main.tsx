import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './store/AuthContext';
import { UnsavedChangesProvider } from './hooks/useUnsavedChangesWarning';
import './i18n/config'; // Initialize i18n
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <UnsavedChangesProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#22150d',
                  color: '#f9f0d9',
                },
                success: {
                  iconTheme: {
                    primary: '#22c55e',
                    secondary: '#f9f0d9',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#f9f0d9',
                  },
                },
              }}
            />
          </UnsavedChangesProvider>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  </StrictMode>
);
