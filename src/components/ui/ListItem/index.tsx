import type { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './ListItem.module.scss';

export interface ListItemProps {
  title: string;
  subtitle?: string;
  arrow?: boolean;
  onClick?: () => void;
  extra?: ReactNode;
  className?: string;
}

function ArrowIcon() {
  return (
    <svg className={styles.arrow} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function ListItem({ title, subtitle, arrow = true, onClick, extra, className }: ListItemProps) {
  const content = (
    <>
      <div className={styles.main}>
        <div className={styles.title}>{title}</div>
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
      </div>
      {extra}
      {arrow && <ArrowIcon />}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cn(styles.item, styles.row, className)} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={cn(styles.item, styles.itemDiv, styles.row, className)}>{content}</div>;
}
