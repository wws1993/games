import { useNavigate, useParams } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { ProgressTimeline } from '../../components/order/ProgressTimeline';
import { useOrders } from '../../context/OrderContext';
import { getOrderPayAmount, orderStatusLabels } from '../../data/mock';
import { Button, Card, Text, toast } from '../../components/ui';
import styles from './OrderDetail.module.scss';

function OrderDetailContent() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, cancelOrder, completeOrder } = useOrders();
  const order = getOrder(orderId);

  if (!order) {
    return <Navigate to="/order" replace />;
  }

  const payAmount = getOrderPayAmount(order);

  const footer = (() => {
    if (order.status === 'pending_payment') {
      return (
        <>
          <Button
            variant="ghost"
            onClick={() => {
              cancelOrder(order.id);
              toast.info('订单已取消');
            }}
          >
            取消订单
          </Button>
          <Button onClick={() => navigate(`/pay/${order.id}`)}>去支付</Button>
        </>
      );
    }
    if (order.status === 'in_progress') {
      return (
        <>
          <Button variant="secondary" onClick={() => toast.info('客服功能即将上线')}>
            联系顾问
          </Button>
          {!order.invoice && (
            <Button variant="ghost" onClick={() => navigate(`/order/${order.id}/invoice`)}>
              申请发票
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={() => {
              completeOrder(order.id);
              toast.success('订单已标记完成（演示）');
            }}
          >
            模拟完成
          </Button>
        </>
      );
    }
    if (order.status === 'completed') {
      return (
        <>
          {!order.review && (
            <Button onClick={() => navigate(`/order/${order.id}/review`)}>评价服务</Button>
          )}
          {!order.invoice && (
            <Button variant="secondary" onClick={() => navigate(`/order/${order.id}/invoice`)}>
              申请发票
            </Button>
          )}
        </>
      );
    }
    return null;
  })();

  return (
    <PageLayout withTabBar={false} footer={footer || undefined}>
      <Card className={styles.summary}>
        <div className={styles.row}>
          <Text variant="secondary">服务名称</Text>
          <span className={styles.value}>{order.serviceName}</span>
        </div>
        <div className={styles.row}>
          <Text variant="secondary">订单状态</Text>
          <span className={styles.status}>{orderStatusLabels[order.status]}</span>
        </div>
        <div className={styles.row}>
          <Text variant="secondary">订单金额</Text>
          <span className={styles.amount}>
            {payAmount > 0 ? `¥${payAmount}` : '免费'}
            {order.discountAmount ? (
              <span className={styles.origin}> （原价 ¥{order.amount}）</span>
            ) : null}
          </span>
        </div>
        <div className={styles.row}>
          <Text variant="secondary">服务顾问</Text>
          <span className={styles.value}>{order.advisor}</span>
        </div>
        {order.review && (
          <div className={styles.row}>
            <Text variant="secondary">我的评价</Text>
            <span className={styles.value}>{'★'.repeat(order.review.rating)}</span>
          </div>
        )}
        {order.invoice && (
          <div className={styles.row}>
            <Text variant="secondary">发票</Text>
            <span className={styles.value}>
              {order.invoice.status === 'pending' ? '申请中' : '已开具'}
            </span>
          </div>
        )}
      </Card>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>办理进度</h2>
        <Card>
          <ProgressTimeline steps={order.progress} />
        </Card>
      </section>
    </PageLayout>
  );
}

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetailContent />
    </RequireAuth>
  );
}
