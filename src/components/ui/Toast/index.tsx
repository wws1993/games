import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../../utils/cn';
import styles from './Toast.module.scss';

type ToastType = 'info' | 'success' | 'error';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

function ToastContainer({ items, onRemove }: { items: ToastItem[]; onRemove: (id: number) => void }) {
  return createPortal(
    <div className={styles.container} aria-live="polite">
      {items.map((item) => (
        <ToastMessage key={item.id} item={item} onRemove={onRemove} />
      ))}
    </div>,
    document.body,
  );
}

function ToastMessage({ item, onRemove }: { item: ToastItem; onRemove: (id: number) => void }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onRemove(item.id), 2500);
    return () => window.clearTimeout(timer);
  }, [item.id, onRemove]);

  return <div className={cn(styles.item, styles[item.type])}>{item.message}</div>;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((message: string, type: ToastType = 'info') => {
    const item: ToastItem = { id: ++toastId, message, type };
    setItems((prev) => [...prev, item]);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer items={items} onRemove={remove} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export const toast = {
  info(message: string) {
    toastApi?.show(message, 'info');
  },
  success(message: string) {
    toastApi?.show(message, 'success');
  },
  error(message: string) {
    toastApi?.show(message, 'error');
  },
};

let toastApi: ToastContextValue | null = null;

export function ToastApiBridge() {
  const ctx = useToast();
  useEffect(() => {
    toastApi = ctx;
    return () => {
      toastApi = null;
    };
  }, [ctx]);
  return null;
}
