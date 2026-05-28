import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Empty.module.scss';

export interface EmptyProps {
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function Empty({ description = '暂无数据', action, className }: EmptyProps) {
  return (
    <div className={cn(styles.empty, className)}>
      <p className={styles.description}>{description}</p>
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
