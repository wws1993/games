import type { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../../utils/cn';
import styles from './TabBar.module.scss';

interface TabItem {
  to: string;
  label: string;
  end?: boolean;
  icon: ReactNode;
}

function HomeIcon({ active }: { active?: boolean }) {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} aria-hidden>
      <path
        d="M4 10.5L12 4l8 6.5V20a1 1 0 01-1 1h-5v-6H10v6H5a1 1 0 01-1-1v-9.5z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GridIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 6h14a2 2 0 012 2v7a2 2 0 01-2 2H9l-4 3v-3H5a2 2 0 01-2-2V8a2 2 0 012-2z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 4h10l2 4H5l2-4zM6 10h12v10H6V10z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg className={styles.icon} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const tabs: TabItem[] = [
  { to: '/', label: '首页', end: true, icon: <HomeIcon /> },
  { to: '/service', label: '服务', icon: <GridIcon /> },
  { to: '/consult', label: '咨询', icon: <ChatIcon /> },
  { to: '/order', label: '订单', icon: <OrderIcon /> },
  { to: '/profile', label: '我的', icon: <UserIcon /> },
];

export function TabBar() {
  return (
    <div className={styles.tabBarWrap}>
      <nav className={styles.tabBar} aria-label="主导航">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          className={({ isActive }) => cn(styles.tab, isActive && styles.active)}
        >
          {({ isActive }) => (
            <>
              {tab.to === '/' ? <HomeIcon active={isActive} /> : tab.icon}
              <span className={styles.label}>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
      </nav>
    </div>
  );
}
