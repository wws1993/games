import { PageLayout } from '../../components/layout/PageLayout';
import { Card, Text } from '../../components/ui';
import styles from './ProfileAbout.module.scss';

const SERVICES = ['工商咨询', '法律服务', '社保民生', '技术开发'];

export default function ProfileAboutPage() {
  return (
    <PageLayout withTabBar={false}>
      <Card className={styles.hero}>
        <div className={styles.logo}>易</div>
        <h1 className={styles.name}>易手办</h1>
        <p className={styles.slogan}>企业与民生事务 · 一站式咨询办理</p>
      </Card>

      <Card className={styles.block}>
        <h2 className={styles.sectionTitle}>平台简介</h2>
        <Text variant="secondary" className={styles.paragraph}>
          易手办面向社区居民、创业者及中小微企业，整合工商、法律、社保、技术四大核心服务，提供「线上咨询 + 线下代办 + 全程跟踪」的一站式办事体验。
        </Text>
        <Text variant="secondary" className={styles.paragraph}>
          我们致力于降低办事门槛，让用户少跑腿、少踩坑，用清晰流程与专业顾问团队，把复杂事务变得简单可预期。
        </Text>
      </Card>

      <Card className={styles.block}>
        <h2 className={styles.sectionTitle}>核心服务</h2>
        <ul className={styles.serviceList}>
          {SERVICES.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className={styles.sectionTitle}>联系我们</h2>
        <dl className={styles.contactList}>
          <div className={styles.contactItem}>
            <dt>客服热线</dt>
            <dd>400-000-0000（工作日 9:00–18:00）</dd>
          </div>
          <div className={styles.contactItem}>
            <dt>商务合作</dt>
            <dd>business@yishouban.com</dd>
          </div>
        </dl>
        <Text variant="caption" className={styles.version}>
          版本 3.2.1
        </Text>
      </Card>
    </PageLayout>
  );
}
