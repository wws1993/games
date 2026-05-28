import type { OrderProgressStep } from '../../../data/mock';
import { cn } from '../../../utils/cn';
import styles from './ProgressTimeline.module.scss';

export function ProgressTimeline({ steps }: { steps: OrderProgressStep[] }) {
  return (
    <div className={styles.timeline}>
      {steps.map((step, i) => (
        <div key={`${step.label}-${i}`} className={cn(styles.item, step.done && styles.done)}>
          <span className={styles.dot} aria-hidden />
          <div className={styles.body}>
            <div className={styles.label}>{step.label}</div>
            {step.time && <div className={styles.time}>{step.time}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
