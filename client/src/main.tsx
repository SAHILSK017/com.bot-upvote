import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { AuthProvider } from '@/context/AuthContext';
import { AuthModalProvider } from '@/context/AuthModalContext';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { ToastProvider } from '@/components/ui/toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider position="bottom-right">
        <AuthProvider>
          <AuthModalProvider>
            <OnboardingProvider>
              <App />
            </OnboardingProvider>
          </AuthModalProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
