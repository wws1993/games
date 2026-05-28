import { useNavigate } from 'react-router-dom';
import { quickServices } from '../../../data/mock';
import styles from './QuickServiceGrid.module.scss';

export function QuickServiceGrid() {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>常用服务</h2>
      </div>
      <div className={styles.grid}>
        {quickServices.map((item) => (
          <button
            key={item.id}
            type="button"
            className={styles.item}
            onClick={() => navigate(`/service/${item.categoryId}`)}
          >
            {item.name}
          </button>
        ))}
      </div>
    </section>
  );
}
