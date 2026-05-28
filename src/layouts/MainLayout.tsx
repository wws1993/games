import { useEffect, useRef } from 'react';
import { Outlet } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { TabBar } from '../components/layout/TabBar';
import styles from './MainLayout.module.scss';

export function MainLayout() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shellBody = rootRef.current?.closest('main');
    if (!shellBody) return;

    const prevOverflow = shellBody.style.overflow;
    shellBody.style.overflow = 'hidden';

    return () => {
      shellBody.style.overflow = prevOverflow;
    };
  }, []);

  return (
    <AppShell footer={<TabBar />}>
      <div ref={rootRef} className={styles.root}>
        <Outlet />
      </div>
    </AppShell>
  );
}
