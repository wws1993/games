import { useMemo, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { useOrders } from '../../context/OrderContext';
import { calcCouponDiscount, mockCoupons, type Coupon } from '../../data/mock';
import { Button, Card, Text } from '../../components/ui';
import styles from './Payment.module.scss';

function PaymentContent() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, payOrder } = useOrders();
  const order = getOrder(orderId);
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const previewDiscount = useMemo(() => {
    if (!order || !selectedCoupon) return 0;
    const coupon = mockCoupons.find((c) => c.id === selectedCoupon);
    return coupon ? calcCouponDiscount(order.amount, coupon) : 0;
  }, [order, selectedCoupon]);

  const payAmount = order ? Math.max(0, order.amount - previewDiscount) : 0;

  if (!order) return <Navigate to="/order" replace />;
  if (order.status !== 'pending_payment') {
    return <Navigate to={`/order/${orderId}`} replace />;
  }

  const handlePay = () => {
    setPaying(true);
    window.setTimeout(() => {
      payOrder(orderId, { couponId: selectedCoupon ?? undefined });
      setPaying(false);
      navigate(`/pay/${orderId}/result`, { replace: true });
    }, 800);
  };

  const renderCoupon = (coupon: Coupon) => {
    const discount = calcCouponDiscount(order.amount, coupon);
    const usable = discount > 0;
    const selected = selectedCoupon === coupon.id;
    const valueLabel = coupon.type === 'fixed' ? `¥${coupon.value}` : `${coupon.value}折`;

    return (
      <button
        key={coupon.id}
        type="button"
        disabled={!usable}
        className={`${styles.couponItem} ${selected ? styles.selected : ''}`}
        onClick={() => setSelectedCoupon(selected ? null : coupon.id)}
      >
        <span className={styles.couponValue}>{valueLabel}</span>
        <span className={styles.couponInfo}>
          <span className={styles.couponTitle}>{coupon.title}</span>
          <span className={styles.couponMeta}>
            满 ¥{coupon.minAmount} 可用 · 至 {coupon.expireAt}
          </span>
        </span>
      </button>
    );
  };

  return (
    <PageLayout
      withTabBar={false}
      footer={
        <Button loading={paying} onClick={handlePay}>
          确认支付 ¥{payAmount}
        </Button>
      }
    >
      <Card className={styles.orderCard}>
          <div className={styles.row}>
            <span className={styles.rowLabel}>服务</span>
            <span>{order.serviceName}</span>
          </div>
          <div className={styles.row}>
            <span className={styles.rowLabel}>原价</span>
            <span>¥{order.amount}</span>
          </div>
          {previewDiscount > 0 && (
            <div className={styles.row}>
              <span className={styles.rowLabel}>优惠</span>
              <span className={styles.discount}>-¥{previewDiscount}</span>
            </div>
          )}
          <div className={styles.row}>
            <span className={styles.rowLabel}>应付</span>
            <span className={styles.amount}>{payAmount > 0 ? `¥${payAmount}` : '免费'}</span>
          </div>
        </Card>

        <section className={styles.couponSection}>
          <h2 className={styles.sectionTitle}>优惠券</h2>
          <div className={styles.couponList}>
            <button
              type="button"
              className={`${styles.couponItem} ${!selectedCoupon ? styles.selected : ''}`}
              onClick={() => setSelectedCoupon(null)}
            >
              <span className={styles.couponTitle}>不使用优惠券</span>
            </button>
            {mockCoupons.map(renderCoupon)}
          </div>
        </section>

        <Card className={styles.wechatPay}>
          <div className={styles.wechatIcon}>微</div>
          <p className={styles.wechatLabel}>微信支付</p>
          <Text variant="caption" style={{ color: 'rgba(255,255,255,0.85)' }}>
            演示环境，点击确认即完成支付
          </Text>
        </Card>
    </PageLayout>
  );
}

export default function PaymentPage() {
  return (
    <RequireAuth>
      <PaymentContent />
    </RequireAuth>
  );
}
