import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { OrderProvider } from './context/OrderContext';
import { ToastApiBridge, ToastProvider } from './components/ui';
import { router } from './router';
import './styles.css';

const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('Missing #app root element');
}

createRoot(appRoot).render(
  <ToastProvider>
    <AuthProvider>
      <OrderProvider>
        <ToastApiBridge />
        <RouterProvider router={router} />
      </OrderProvider>
    </AuthProvider>
  </ToastProvider>,
);
