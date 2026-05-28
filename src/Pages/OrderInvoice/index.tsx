import { useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { RequireAuth } from '../../components/auth/RequireAuth';
import { PageLayout } from '../../components/layout/PageLayout';
import { useOrders } from '../../context/OrderContext';
import { getOrderPayAmount } from '../../data/mock';
import { Button, Card, Text, toast } from '../../components/ui';
import styles from './OrderInvoice.module.scss';

function OrderInvoiceContent() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { getOrder, submitInvoice } = useOrders();
  const order = getOrder(orderId);

  const [type, setType] = useState<'electronic' | 'paper'>('electronic');
  const [title, setTitle] = useState('');
  const [taxNo, setTaxNo] = useState('');
  const [email, setEmail] = useState('');

  if (!order) return <Navigate to="/order" replace />;
  if (order.invoice) return <Navigate to={`/order/${orderId}`} replace />;
  if (order.status !== 'completed' && order.status !== 'in_progress') {
    return <Navigate to={`/order/${orderId}`} replace />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('请填写发票抬头');
      return;
    }
    submitInvoice(orderId, {
      type,
      title: title.trim(),
      taxNo: taxNo.trim() || undefined,
      email: email.trim() || undefined,
    });
    toast.success('发票申请已提交');
    navigate(`/order/${orderId}`, { replace: true });
  };

  return (
    <PageLayout
      withTabBar={false}
      footer={
        <Button type="submit" form="invoice-form">
          提交申请
        </Button>
      }
    >
      <Card className={styles.summary}>
        <Text variant="secondary">
          订单金额 ¥{getOrderPayAmount(order)} · {order.serviceName}
        </Text>
      </Card>

      <form id="invoice-form" onSubmit={handleSubmit}>
        <div className={styles.typeRow}>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'electronic' ? styles.active : ''}`}
            onClick={() => setType('electronic')}
          >
            电子发票
          </button>
          <button
            type="button"
            className={`${styles.typeBtn} ${type === 'paper' ? styles.active : ''}`}
            onClick={() => setType('paper')}
          >
            纸质发票
          </button>
        </div>

        <label className={styles.field}>
          <span className={styles.label}>发票抬头 *</span>
          <input
            className={styles.input}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="企业或个人名称"
          />
        </label>

        <label className={styles.field}>
          <span className={styles.label}>税号（选填）</span>
          <input
            className={styles.input}
            value={taxNo}
            onChange={(e) => setTaxNo(e.target.value)}
            placeholder="企业纳税人识别号"
          />
        </label>

        {type === 'electronic' && (
          <label className={styles.field}>
            <span className={styles.label}>接收邮箱</span>
            <input
              className={styles.input}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="用于接收电子发票"
            />
          </label>
        )}
      </form>
    </PageLayout>
  );
}

export default function OrderInvoicePage() {
  return (
    <RequireAuth>
      <OrderInvoiceContent />
    </RequireAuth>
  );
}
