import type { HTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Text.module.scss';

export type TextVariant = 'body' | 'secondary' | 'caption';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: 'p' | 'span' | 'div';
}

export function Text({
  variant = 'body',
  as: Tag = 'p',
  className,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag className={cn(styles.text, styles[variant], className)} {...rest}>
      {children}
    </Tag>
  );
}
