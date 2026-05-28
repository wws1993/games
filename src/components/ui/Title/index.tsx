import type { HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Title.module.scss';

export interface TitleProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2;
  as?: 'h1' | 'h2' | 'h3';
}

export function Title({ level = 1, as, className, children, ...rest }: TitleProps) {
  const Tag = as ?? (level === 1 ? 'h1' : 'h2');

  return (
    <Tag
      className={cn(styles.title, level === 1 ? styles.level1 : styles.level2, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
