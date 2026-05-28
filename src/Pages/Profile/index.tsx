import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PageLayout } from '../../components/layout/PageLayout';
import { Button, Card, ListItem, Text, Title } from '../../components/ui';
import styles from './Profile.module.scss';

export default function ProfilePage() {
  const { user, isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <PageLayout fill header={<Title>我的</Title>}>
      <Card className={styles.userCard}>
        {isLoggedIn && user ? (
          <div className={styles.userRow}>
            <div className={styles.avatar}>{user.nickname.slice(0, 1)}</div>
            <div className={styles.userInfo}>
              <p className={styles.nickname}>{user.nickname}</p>
              <p className={styles.phone}>
                {user.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')}
              </p>
            </div>
            <button type="button" className={styles.logoutBtn} onClick={logout}>
              退出
            </button>
          </div>
        ) : (
          <div className={styles.loginPrompt}>
            <Text variant="secondary">登录后享受完整服务</Text>
            <Button block onClick={() => navigate('/login', { state: { from: '/profile' } })}>
              登录 / 注册
            </Button>
          </div>
        )}
      </Card>

      <Card padding={false} className={styles.section}>
        <ListItem title="我的订单" onClick={() => navigate('/order')} />
        <ListItem
          title="消息中心"
          subtitle="系统与订单通知"
          onClick={() => navigate('/profile/messages')}
        />
        <ListItem title="我的优惠券" onClick={() => navigate('/profile/coupons')} />
      </Card>

      <Card padding={false} className={styles.section}>
        <ListItem title="帮助中心" onClick={() => navigate('/profile/help')} />
        <ListItem title="关于我们" onClick={() => navigate('/profile/about')} />
        <ListItem title="组件演示" subtitle="开发调试" onClick={() => navigate('/demo')} />
      </Card>
    </PageLayout>
  );
}
