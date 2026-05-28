import type { ReactNode } from 'react';
import { ActionBar } from '../ActionBar';
import { cn } from '../../../utils/cn';
import styles from './PageLayout.module.scss';

export interface PageLayoutProps {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  withTabBar?: boolean;
  fill?: boolean;
  className?: string;
}

export function PageLayout({
  children,
  header,
  footer,
  withTabBar = true,
  fill = false,
  className,
}: PageLayoutProps) {
  const body = fill ? <div className={styles.scroll}>{children}</div> : children;

  return (
    <div
      className={cn(
        styles.page,
        fill && styles.fill,
        withTabBar && styles.withTabBar,
        footer && styles.withFooter,
        className,
      )}
    >
      {header && <header className={styles.header}>{header}</header>}
      {body}
      {footer && <ActionBar>{footer}</ActionBar>}
    </div>
  );
}
