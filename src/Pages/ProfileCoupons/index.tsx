import { PageLayout } from '../../components/layout/PageLayout';
import { memberPlans, mockCoupons } from '../../data/mock';
import { Button, Card, toast } from '../../components/ui';
import styles from './ProfileCoupons.module.scss';

export default function ProfileCouponsPage() {
  return (
    <PageLayout withTabBar={false}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>我的优惠券</h2>
        {mockCoupons.map((c) => (
          <Card key={c.id} className={styles.couponCard} padding={false}>
            <div className={styles.couponLeft}>
              <span className={styles.couponAmount}>
                {c.type === 'fixed' ? `¥${c.value}` : `${c.value}折`}
              </span>
              <span className={styles.couponType}>
                {c.type === 'fixed' ? '立减' : '折扣'}
              </span>
            </div>
            <div className={styles.couponRight}>
              <p className={styles.couponTitle}>{c.title}</p>
              <p className={styles.couponMeta}>
                满 ¥{c.minAmount} 可用 · 有效期至 {c.expireAt}
              </p>
              <Button
                variant="ghost"
                size="sm"
                className={styles.useBtn}
                onClick={() => toast.info('下单支付时可选优惠券')}
              >
                去使用
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>会员方案</h2>
        {memberPlans.map((plan) => (
          <Card
            key={plan.id}
            className={`${styles.memberCard} ${plan.recommended ? styles.recommended : ''}`}
          >
            <div className={styles.memberHead}>
              <span className={styles.memberName}>
                {plan.name}
                {plan.recommended && <span className={styles.badge}>推荐</span>}
              </span>
              <span className={styles.memberPrice}>
                ¥{plan.price}/{plan.unit}
              </span>
            </div>
            <ul className={styles.benefits}>
              {plan.benefits.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
            <Button
              block
              size="sm"
              variant={plan.recommended ? 'primary' : 'secondary'}
              className={styles.detailBtn}
              onClick={() => toast.info('会员开通即将上线')}
            >
              了解详情
            </Button>
          </Card>
        ))}
      </section>
    </PageLayout>
  );
}
