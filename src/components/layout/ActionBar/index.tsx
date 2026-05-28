import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './ActionBar.module.scss';

export interface ActionBarProps {
  children: ReactNode;
  className?: string;
}

export function ActionBar({ children, className }: ActionBarProps) {
  return (
    <div className={cn(styles.bar, className)}>
      <div className={styles.inner}>{children}</div>
    </div>
  );
}
