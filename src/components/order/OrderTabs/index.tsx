import { orderStatusTabs, type OrderStatus } from '../../../data/mock';
import { cn } from '../../../utils/cn';
import styles from './OrderTabs.module.scss';

export function OrderTabs({
  value,
  onChange,
}: {
  value: OrderStatus | 'all';
  onChange: (v: OrderStatus | 'all') => void;
}) {
  return (
    <div className={styles.tabs} role="tablist">
      {orderStatusTabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          aria-selected={value === tab.key}
          className={cn(styles.tab, value === tab.key && styles.active)}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
