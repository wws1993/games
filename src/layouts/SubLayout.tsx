import { useEffect, useRef } from 'react';
import { Outlet, useLocation, useMatches, useParams } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { NavBar } from '../components/layout/NavBar';
import { getCategoryById, getServiceDetail, isServiceCategoryId } from '../data/mock';
import styles from './SubLayout.module.scss';

export function SubLayout() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { categoryId, serviceId, newsId } = useParams();
  const location = useLocation();
  const matches = useMatches();
  const last = matches[matches.length - 1];
  const staticTitle = (last?.handle as { title?: string } | undefined)?.title;
  const path = location.pathname;

  let title = staticTitle ?? '';
  if (path.includes('/pay/') && path.includes('/result')) {
    title = '支付结果';
  } else if (path.includes('/pay/')) {
    title = '收银台';
  } else if (path.includes('/review')) {
    title = '评价服务';
  } else if (path.includes('/invoice')) {
    title = '申请发票';
  } else if (newsId) {
    title = '资讯详情';
  } else if (serviceId) {
    title = getServiceDetail(serviceId)?.name ?? '服务详情';
  } else if (categoryId && isServiceCategoryId(categoryId)) {
    title = getCategoryById(categoryId)?.name ?? '服务分类';
  }

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const shellBody = scrollEl?.closest('main');
    if (!scrollEl || !shellBody) return;

    const prevOverflow = shellBody.style.overflow;
    shellBody.style.overflow = 'hidden';
    shellBody.scrollTop = 0;
    scrollEl.scrollTop = 0;

    return () => {
      shellBody.style.overflow = prevOverflow;
    };
  }, [location.pathname]);

  return (
    <AppShell>
      <div className={styles.layout}>
        <header className={styles.header}>
          <NavBar title={title} />
        </header>
        <div ref={scrollRef} className={styles.scrollBody}>
          <Outlet />
        </div>
      </div>
    </AppShell>
  );
}
