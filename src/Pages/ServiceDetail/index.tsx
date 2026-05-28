import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOrders } from '../../context/OrderContext';
import { getServiceDetail, isServiceCategoryId } from '../../data/mock';
import { FeeCalculator } from '../../components/service/FeeCalculator';
import { feeCalculatorServiceIds } from '../../data/mock';
import { PageLayout } from '../../components/layout/PageLayout';
import { Button, Card, Text, toast } from '../../components/ui';
import styles from './ServiceDetail.module.scss';

export default function ServiceDetailPage() {
  const { categoryId = '', serviceId = '' } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { createOrder } = useOrders();

  if (!isServiceCategoryId(categoryId)) {
    return <Navigate to="/" replace />;
  }

  const service = getServiceDetail(serviceId);
  if (!service || service.categoryId !== categoryId) {
    return <Navigate to={`/service/${categoryId}`} replace />;
  }

  const handleOrder = () => {
    if (!isLoggedIn) {
      navigate('/login', { state: { from: `/service/${categoryId}/${serviceId}` } });
      return;
    }
    const order = createOrder(serviceId);
    if (order) {
      toast.success('订单已创建');
      navigate(`/order/${order.id}`);
    }
  };

  return (
    <PageLayout
      withTabBar={false}
      footer={
        <>
          <Button variant="secondary" onClick={() => navigate('/consult')}>
            立即咨询
          </Button>
          <Button onClick={handleOrder}>立即下单</Button>
        </>
      }
    >
      <Card className={styles.priceCard}>
        <div className={styles.priceRow}>
          <span className={styles.price}>
            {service.price > 0 ? `¥${service.price}` : '免费'}
          </span>
          {service.priceNote && <span className={styles.priceNote}>{service.priceNote}</span>}
        </div>
        <Text variant="secondary">{service.desc}</Text>
      </Card>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>服务流程</h2>
        <Card padding={false}>
          <ol className={styles.steps}>
            {service.steps.map((step, i) => (
              <li key={step}>
                <span className={styles.stepNum}>{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>
      </section>

      {feeCalculatorServiceIds.includes(service.id) && (
        <FeeCalculator basePrice={service.price} serviceId={service.id} />
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>包含项目</h2>
        <Card>
          <ul className={styles.includes}>
            {service.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </section>
    </PageLayout>
  );
}
