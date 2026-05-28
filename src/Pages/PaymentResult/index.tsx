import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { useOrders } from '../../context/OrderContext';
import { getOrderPayAmount } from '../../data/mock';
import { Button } from '../../components/ui';
import styles from './PaymentResult.module.scss';

function PaymentResultContent() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder } = useOrders();
  const order = getOrder(orderId);

  if (!order) return <Navigate to="/order" replace />;
  if (order.status === 'pending_payment') {
    return <Navigate to={`/pay/${orderId}`} replace />;
  }

  const paid = getOrderPayAmount(order);

  return (
    <PageLayout
      withTabBar={false}
      footer={
        <>
          <Button onClick={() => navigate(`/order/${orderId}`)}>查看订单</Button>
          <Button variant="secondary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        </>
      }
    >
      <div className={styles.wrap}>
        <div className={`${styles.icon} ${styles.success}`}>✓</div>
        <h1 className={styles.title}>支付成功</h1>
        <p className={styles.desc}>订单已支付，顾问将尽快为您服务</p>
        <p className={styles.amount}>{paid > 0 ? `¥${paid}` : '免费'}</p>
      </div>
    </PageLayout>
  );
}

export default function PaymentResultPage() {
  return (
    <RequireAuth>
      <PaymentResultContent />
    </RequireAuth>
  );
}
