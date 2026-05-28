import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Card.module.scss';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean;
  children: ReactNode;
}

export function Card({
  padding = true,
  className,
  onClick,
  children,
  ...rest
}: CardProps) {
  const handleKeyDown = onClick
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(e as unknown as MouseEvent<HTMLDivElement>);
        }
      }
    : undefined;

  return (
    <div
      className={cn(
        styles.card,
        padding ? styles.padding : styles.noPadding,
        onClick && styles.clickable,
        className,
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
      {...rest}
    >
      {children}
    </div>
  );
}
