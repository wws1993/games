import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button, Text, toast } from '../../components/ui';
import styles from './Login.module.scss';

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/profile';

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(phone, code);
    setLoading(false);
    if (ok) {
      toast.success('登录成功');
      navigate(from, { replace: true });
    } else {
      toast.error('请输入 11 位手机号，验证码 123456');
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>登录易手办</h1>
        <Text variant="secondary" className={styles.sub}>
          演示环境验证码固定为 <strong>123456</strong>
        </Text>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span className={styles.label}>手机号</span>
            <input
              className={styles.input}
              type="tel"
              maxLength={11}
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>验证码</span>
            <input
              className={styles.input}
              type="text"
              maxLength={6}
              placeholder="请输入验证码"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </label>
          <Button type="submit" block loading={loading}>
            登录
          </Button>
        </form>

        <button type="button" className={styles.back} onClick={() => navigate(-1)}>
          返回
        </button>
      </div>
    </div>
  );
}
