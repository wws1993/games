import { useCallback, useEffect, useRef, useState } from 'react';
import { banners } from '../../../data/mock';
import { cn } from '../../../utils/cn';
import styles from './BannerCarousel.module.scss';

const AUTO_PLAY_MS = 4500;
const PROGRAMMATIC_SCROLL_MS = 520;

export function BannerCarousel() {
  const trackRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);
  const autoplayRef = useRef<number | null>(null);
  const scrollEndRef = useRef<number | null>(null);
  const programmaticRef = useRef(false);
  const [active, setActive] = useState(0);
  const [progressKey, setProgressKey] = useState(0);

  const applyIndex = useCallback((index: number) => {
    const next = ((index % banners.length) + banners.length) % banners.length;
    if (next === activeRef.current) return false;
    activeRef.current = next;
    setActive(next);
    setProgressKey((k) => k + 1);
    return true;
  }, []);

  const clearAutoplay = useCallback(() => {
    if (autoplayRef.current !== null) {
      window.clearTimeout(autoplayRef.current);
      autoplayRef.current = null;
    }
  }, []);

  const scheduleAutoplay = useCallback(() => {
    clearAutoplay();
    autoplayRef.current = window.setTimeout(() => {
      const track = trackRef.current;
      if (!track) return;
      const next = (activeRef.current + 1) % banners.length;
      const slide = track.children[next] as HTMLElement | undefined;
      programmaticRef.current = true;
      slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      applyIndex(next);
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, PROGRAMMATIC_SCROLL_MS);
      scheduleAutoplay();
    }, AUTO_PLAY_MS);
  }, [applyIndex, clearAutoplay]);

  const resetAutoplay = useCallback(() => {
    scheduleAutoplay();
  }, [scheduleAutoplay]);

  const scrollToIndex = useCallback(
    (index: number) => {
      const track = trackRef.current;
      if (!track) return;
      const slide = track.children[index] as HTMLElement | undefined;
      programmaticRef.current = true;
      slide?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
      applyIndex(index);
      window.setTimeout(() => {
        programmaticRef.current = false;
      }, PROGRAMMATIC_SCROLL_MS);
      resetAutoplay();
    },
    [applyIndex, resetAutoplay],
  );

  const onScroll = useCallback(() => {
    if (programmaticRef.current) return;

    const track = trackRef.current;
    if (!track || !track.children.length) return;
    const slideWidth = track.clientWidth;
    if (!slideWidth) return;

    const index = Math.round(track.scrollLeft / slideWidth);
    const next = Math.min(Math.max(index, 0), banners.length - 1);
    if (next !== activeRef.current) {
      applyIndex(next);
    }

    if (scrollEndRef.current !== null) {
      window.clearTimeout(scrollEndRef.current);
    }
    scrollEndRef.current = window.setTimeout(() => {
      if (!programmaticRef.current) {
        resetAutoplay();
      }
    }, 120);
  }, [applyIndex, resetAutoplay]);

  useEffect(() => {
    scheduleAutoplay();
    return () => {
      clearAutoplay();
      if (scrollEndRef.current !== null) {
        window.clearTimeout(scrollEndRef.current);
      }
    };
  }, [scheduleAutoplay, clearAutoplay]);

  return (
    <section className={styles.wrap} aria-label="活动轮播">
      <div className={styles.viewport}>
        <div ref={trackRef} className={styles.track} onScroll={onScroll}>
          {banners.map((item) => (
            <article key={item.id} className={styles.slide}>
              <img className={styles.bg} src={item.image} alt="" loading="lazy" decoding="async" />
              <div
                className={styles.overlay}
                style={{
                  background:
                    item.overlay ?? 'linear-gradient(105deg, rgba(0,0,0,0.55), rgba(0,0,0,0.2))',
                }}
              />
              <div className={styles.content}>
                {item.tag && <span className={styles.tag}>{item.tag}</span>}
                <h3 className={styles.title}>{item.title}</h3>
                <p className={styles.subtitle}>{item.subtitle}</p>
              </div>
            </article>
          ))}
        </div>

        <div className={styles.dots} role="tablist" aria-label="轮播指示">
          {banners.map((item, i) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={i === active}
              className={cn(styles.dot, i === active && styles.dotActive)}
              aria-label={`第 ${i + 1} 张`}
              onClick={() => scrollToIndex(i)}
            >
              {i === active && (
                <span
                  key={progressKey}
                  className={styles.dotProgress}
                  style={{ animationDuration: `${AUTO_PLAY_MS}ms` }}
                />
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
