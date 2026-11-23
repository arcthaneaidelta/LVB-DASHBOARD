import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../services/store';
import { AppRouter } from './router';
import { ToastViewport } from '../components/ui/Primitives';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const AppShellWithToasts: React.FC = () => {
  const { toasts, dismissToast } = useApp();
  return (
    <>
      <AppRouter />
      <ToastViewport toasts={toasts} onDismiss={dismissToast} />
    </>
  );
};

export const App: React.FC = () => (
  <ErrorBoundary>
    <AppProvider>
      <BrowserRouter>
        <AppShellWithToasts />
      </BrowserRouter>
    </AppProvider>
  </ErrorBoundary>
);

export default App;
