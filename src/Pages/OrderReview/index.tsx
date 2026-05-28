import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { useOrders } from '../../context/OrderContext';
import { Button, Card, Text, toast } from '../../components/ui';
import styles from './OrderReview.module.scss';

function OrderReviewContent() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, submitReview } = useOrders();
  const order = getOrder(orderId);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');

  if (!order) return <Navigate to="/order" replace />;
  if (order.status !== 'completed') return <Navigate to={`/order/${orderId}`} replace />;
  if (order.review) return <Navigate to={`/order/${orderId}`} replace />;

  const handleSubmit = () => {
    if (!content.trim()) {
      toast.error('请填写评价内容');
      return;
    }
    submitReview(orderId, { rating, content: content.trim() });
    toast.success('评价已提交');
    navigate(`/order/${orderId}`, { replace: true });
  };

  return (
    <PageLayout
      withTabBar={false}
      footer={<Button onClick={handleSubmit}>提交评价</Button>}
    >
      <Card className={styles.summary}>
        <Text variant="secondary">为「{order.serviceName}」服务评分</Text>
      </Card>

      <section className={styles.ratingSection}>
        <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.star} ${n <= rating ? styles.on : ''}`}
            onClick={() => setRating(n)}
            aria-label={`${n} 星`}
          >
            ★
          </button>
        ))}
        </div>
      </section>

      <textarea
        className={styles.textarea}
        placeholder="分享您的服务体验…"
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
    </PageLayout>
  );
}

export default function OrderReviewPage() {
  return (
    <RequireAuth>
      <OrderReviewContent />
    </RequireAuth>
  );
}
