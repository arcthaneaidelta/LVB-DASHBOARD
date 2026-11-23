import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AppProvider, useApp } from '../services/store';
import { AppRouter } from './router';
import { ToastViewport } from '../components/ui/Primitives';

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
  <AppProvider>
    <BrowserRouter>
      <AppShellWithToasts />
    </BrowserRouter>
  </AppProvider>
);

export default App;
