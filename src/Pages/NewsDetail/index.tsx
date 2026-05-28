import { Navigate, useParams } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { getNewsById } from '../../data/mock';
import { Card } from '../../components/ui';
import styles from './NewsDetail.module.scss';

export default function NewsDetailPage() {
  const { newsId = '' } = useParams();
  const news = getNewsById(newsId);

  if (!news) return <Navigate to="/" replace />;

  return (
    <PageLayout withTabBar={false}>
      <Card>
        <div className={styles.meta}>
          <span className={styles.tag}>{news.tag}</span>
          <span className={styles.date}>{news.date}</span>
        </div>
        <h1 className={styles.title}>{news.title}</h1>
        <article className={styles.content}>
          {news.content.map((para) => (
            <p key={para}>{para}</p>
          ))}
        </article>
      </Card>
    </PageLayout>
  );
}
