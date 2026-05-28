import type { InputHTMLAttributes } from 'react';
import { cn } from '../../../utils/cn';
import styles from './SearchBar.module.scss';

export interface SearchBarProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onSearch?: (value: string) => void;
}

function SearchIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="M20 20L16 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SearchBar({ className, onSearch, onKeyDown, ...rest }: SearchBarProps) {
  return (
    <label className={cn(styles.wrapper, className)}>
      <SearchIcon />
      <input
        type="search"
        enterKeyHint="search"
        className={styles.input}
        onKeyDown={(e) => {
          onKeyDown?.(e);
          if (e.key === 'Enter' && onSearch) {
            onSearch((e.target as HTMLInputElement).value);
          }
        }}
        {...rest}
      />
    </label>
  );
}
