/** 应用入口：挂载 React 根组件 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';

const rootEl = document.getElementById('root')!;

createRoot(rootEl).render(
  <StrictMode>

    <div className='font-black text-shadow-fuchsia-900'>123123</div>
  </StrictMode>
);
