import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import type { OrderStatus } from '../../data/mock';
import { PageLayout } from '../../components/layout/PageLayout';
import { OrderCard } from '../../components/order/OrderCard';
import { OrderTabs } from '../../components/order/OrderTabs';
import { Button, Empty, Title } from '../../components/ui';
import styles from './Order.module.scss';

export default function OrderPage() {
  const { isLoggedIn } = useAuth();
  const { orders } = useOrders();
  const navigate = useNavigate();
  const [tab, setTab] = useState<OrderStatus | 'all'>('all');

  const filtered = useMemo(() => {
    if (tab === 'all') return orders;
    return orders.filter((o) => o.status === tab);
  }, [orders, tab]);

  if (!isLoggedIn) {
    return (
      <PageLayout fill header={<Title>订单</Title>}>
        <Empty
          description="登录后查看订单"
          action={
            <Button onClick={() => navigate('/login', { state: { from: '/order' } })}>
              去登录
            </Button>
          }
        />
      </PageLayout>
    );
  }

  return (
    <PageLayout fill header={<Title>订单</Title>}>
      <OrderTabs value={tab} onChange={setTab} />
      {filtered.length === 0 ? (
        <Empty description="暂无相关订单" />
      ) : (
        <div className={styles.list}>
          {filtered.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
