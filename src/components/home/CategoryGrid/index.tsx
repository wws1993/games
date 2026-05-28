import type { CSSProperties, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { serviceCategories, type ServiceCategory } from '../../../data/mock';
import styles from './CategoryGrid.module.scss';

function CategoryIcon({ category }: { category: ServiceCategory }) {
  const color = category.color;
  const icons: Record<ServiceCategory['id'], ReactNode> = {
    business: (
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="6" width="16" height="14" rx="2" stroke={color} strokeWidth="1.8" />
        <path d="M8 6V5a2 2 0 012-2h4a2 2 0 012 2v1" stroke={color} strokeWidth="1.8" />
      </svg>
    ),
    legal: (
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l7 3v5c0 4.5-3.5 8-7 10-3.5-2-7-5.5-7-10V6l7-3z" stroke={color} strokeWidth="1.8" />
      </svg>
    ),
    social: (
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="8" r="3" stroke={color} strokeWidth="1.8" />
        <path d="M6 20v-1a4 4 0 018 0v1M18 20v-1a3 3 0 00-2-2.8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    tech: (
      <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="5" width="18" height="12" rx="2" stroke={color} strokeWidth="1.8" />
        <path d="M8 20h8" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[category.id];
}

export function CategoryGrid() {
  const navigate = useNavigate();

  return (
    <div className={styles.grid}>
      {serviceCategories.map((cat) => (
        <button
          key={cat.id}
          type="button"
          className={styles.item}
          style={{ '--cat-color': cat.color } as CSSProperties}
          onClick={() => navigate(`/service/${cat.id}`)}
        >
          <span className={styles.iconWrap}>
            <CategoryIcon category={cat} />
          </span>
          <span className={styles.label}>{cat.shortName}</span>
        </button>
      ))}
    </div>
  );
}
