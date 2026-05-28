import { useNavigate } from 'react-router-dom';
import { newsList, type NewsItem } from '../../../data/mock';
import { Card } from '../../ui';
import styles from './NewsList.module.scss';

interface NewsListProps {
  items?: NewsItem[];
  title?: string;
}

export function NewsList({ items = newsList, title = '本地资讯' }: NewsListProps) {
  const navigate = useNavigate();

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{title}</h2>
      <div className={styles.list}>
        {items.map((item) => (
          <Card
            key={item.id}
            padding={false}
            className={styles.card}
            onClick={() => navigate(`/news/${item.id}`)}
          >
            <div className={styles.meta}>
              <span className={styles.tag}>{item.tag}</span>
              <span className={styles.date}>{item.date}</span>
            </div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.summary}>{item.summary}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
