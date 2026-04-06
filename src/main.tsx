import { createRoot } from 'react-dom/client';
import './styles.css';

/** 应用根组件，展示 Hallo World。 */
function App(): React.JSX.Element {
  return <main className='flex min-h-screen items-center justify-center bg-zinc-100 text-5xl font-bold text-zinc-800'>Hallo World</main>;
}

const appRoot = document.getElementById('app');

if (!appRoot) {
  throw new Error('Missing #app root element');
}

createRoot(appRoot).render(<App />);
