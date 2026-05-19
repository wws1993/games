import { createRoot } from 'react-dom/client';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import './styles.css';
import HomePage from './Pages/home';

/** 应用路由，仅注册游戏首页。 */
const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
]);

const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('Missing #app root element');
}

createRoot(appRoot).render(<RouterProvider router={router} />);
