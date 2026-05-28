import { useNavigate } from 'react-router-dom';
import { orderStatusLabels, type Order } from '../../../data/mock';
import { Card } from '../../ui';
import styles from './OrderCard.module.scss';

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getMonth() + 1}-${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function OrderCard({ order }: { order: Order }) {
  const navigate = useNavigate();
  const statusClass = styles[order.status] ?? styles.cancelled;

  return (
    <Card className={styles.card} onClick={() => navigate(`/order/${order.id}`)}>
      <div className={styles.head}>
        <h3 className={styles.name}>{order.serviceName}</h3>
        <span className={`${styles.status} ${statusClass}`}>{orderStatusLabels[order.status]}</span>
      </div>
      <div className={styles.meta}>
        <span>{order.categoryName}</span>
        <span className={styles.amount}>{order.amount > 0 ? `¥${order.amount}` : '免费'}</span>
      </div>
      <div className={styles.meta} style={{ marginTop: 4 }}>
        <span>{formatDate(order.createdAt)}</span>
        <span>顾问：{order.advisor}</span>
      </div>
    </Card>
  );
}
