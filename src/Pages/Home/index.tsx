import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '../../components/layout/PageLayout';
import { BannerCarousel } from '../../components/home/BannerCarousel';
import { CategoryGrid } from '../../components/home/CategoryGrid';
import { NewsList } from '../../components/home/NewsList';
import { QuickServiceGrid } from '../../components/home/QuickServiceGrid';
import { SectionTitle } from '../../components/home/SectionTitle';
import { searchHomeContent } from '../../data/mock';
import { Empty, SearchBar } from '../../components/ui';
import { cn } from '../../utils/cn';
import styles from './Home.module.scss';

const COLLAPSE_THRESHOLD = 48;

export default function HomePage() {
  const [keyword, setKeyword] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const searchResult = useMemo(() => searchHomeContent(keyword), [keyword]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    const shellBody = scrollEl?.closest('main');
    if (!scrollEl || !shellBody) return;

    const prevOverflow = shellBody.style.overflow;
    shellBody.style.overflow = 'hidden';
    shellBody.scrollTop = 0;

    const onScroll = () => {
      setCollapsed(scrollEl.scrollTop > COLLAPSE_THRESHOLD);
    };

    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      shellBody.style.overflow = prevOverflow;
    };
  }, []);

  const mainContent = searchResult.hasQuery ? (
    <>
      {searchResult.services.length > 0 && (
        <section className={styles.searchSection}>
          <SectionTitle>相关服务</SectionTitle>
          <div className={styles.searchGrid}>
            {searchResult.services.map((s) => (
              <button
                key={s.id}
                type="button"
                className={styles.searchItem}
                onClick={() => navigate(`/service/${s.categoryId}`)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </section>
      )}
      {searchResult.categories && searchResult.categories.length > 0 && (
        <section className={styles.searchSection}>
          <SectionTitle>相关分类</SectionTitle>
          <div className={styles.searchGrid}>
            {searchResult.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className={styles.searchItem}
                onClick={() => navigate(`/service/${c.id}`)}
              >
                {c.name}
              </button>
            ))}
          </div>
        </section>
      )}
      {searchResult.news.length > 0 ? (
        <NewsList items={searchResult.news} title="相关资讯" />
      ) : null}
      {searchResult.services.length === 0 &&
        (!searchResult.categories || searchResult.categories.length === 0) &&
        searchResult.news.length === 0 && (
          <Empty description={`未找到「${keyword}」相关内容`} />
        )}
    </>
  ) : (
    <>
      <SectionTitle>服务分类</SectionTitle>
      <CategoryGrid />
      <BannerCarousel />
      <QuickServiceGrid />
      <NewsList />
    </>
  );

  return (
    <PageLayout className={styles.homeLayout} withTabBar={false}>
      <div className={cn(styles.headerZone, collapsed && styles.headerZoneCollapsed)}>
        <section className={styles.hero}>
          <div className={styles.brandMark} aria-hidden>
            易
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>易手办</h1>
            <p className={styles.heroSub}>企业与民生事务 · 一站式咨询办理</p>
          </div>
        </section>

        <div className={styles.searchWrap}>
          <SearchBar
            className={collapsed ? styles.searchCompact : undefined}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜索服务、政策、办事指南"
            onSearch={(v) => setKeyword(v)}
          />
        </div>
      </div>

      <div ref={scrollRef} className={styles.scrollContent}>
        {mainContent}
      </div>
    </PageLayout>
  );
}
