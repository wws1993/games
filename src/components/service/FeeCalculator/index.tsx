import { useMemo, useState } from 'react';
import { Card, Select } from '../../ui';
import styles from './FeeCalculator.module.scss';

const COMPANY_TYPE_OPTIONS = [
  { value: 'limited', label: '有限责任公司' },
  { value: 'individual', label: '个体工商户' },
  { value: 'partnership', label: '合伙企业' },
];

const SCALE_OPTIONS = [
  { value: 'standard', label: '标准版' },
  { value: 'advanced', label: '进阶版' },
  { value: 'enterprise', label: '企业版' },
];

interface FeeCalculatorProps {
  basePrice: number;
  serviceId: string;
}

export function FeeCalculator({ basePrice, serviceId }: FeeCalculatorProps) {
  const [companyType, setCompanyType] = useState('limited');
  const [needAddress, setNeedAddress] = useState(false);
  const [urgent, setUrgent] = useState(false);
  const [scale, setScale] = useState('standard');

  const estimated = useMemo(() => {
    let total = basePrice;
    if (serviceId === 'b1') {
      if (companyType === 'individual') total -= 200;
      if (companyType === 'partnership') total += 100;
      if (needAddress) total += 200;
      if (urgent) total += 150;
    } else if (serviceId === 'b2') {
      if (urgent) total += 100;
    } else if (serviceId === 't1' || serviceId === 't3') {
      if (scale === 'advanced') total = Math.floor(total * 1.5);
      if (scale === 'enterprise') total = Math.floor(total * 2.2);
      if (urgent) total += 500;
    }
    return Math.max(0, total);
  }, [basePrice, serviceId, companyType, needAddress, urgent, scale]);

  const isBusiness = serviceId === 'b1' || serviceId === 'b2';
  const isTech = serviceId === 't1' || serviceId === 't3';

  if (!isBusiness && !isTech) return null;

  return (
    <section className={styles.wrap}>
      <h2 className={styles.title}>费用估算</h2>
      <Card>
        {serviceId === 'b1' && (
          <div className={styles.field}>
            <span className={styles.label}>注册类型</span>
            <Select
              value={companyType}
              options={COMPANY_TYPE_OPTIONS}
              onChange={setCompanyType}
            />
          </div>
        )}

        {(serviceId === 't1' || serviceId === 't3') && (
          <div className={styles.field}>
            <span className={styles.label}>项目规模</span>
            <Select value={scale} options={SCALE_OPTIONS} onChange={setScale} />
          </div>
        )}

        {serviceId === 'b1' && (
          <label className={styles.checkRow}>
            <input type="checkbox" checked={needAddress} onChange={(e) => setNeedAddress(e.target.checked)} />
            需要注册地址（+¥200）
          </label>
        )}

        <label className={styles.checkRow}>
          <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} />
          加急办理
        </label>

        <div className={styles.result}>
          <span className={styles.resultLabel}>预估费用</span>
          <span className={styles.resultPrice}>¥{estimated}</span>
        </div>
        <p className={styles.hint}>仅供参考，实际费用以顾问报价为准</p>
      </Card>
    </section>
  );
}
