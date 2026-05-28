import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './AppShell.module.scss';

export interface AppShellProps {
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function AppShell({ children, footer, className }: AppShellProps) {
  return (
    <div className={cn(styles.shell, className)}>
      <main className={styles.body}>{children}</main>
      {footer}
    </div>
  );
}
