import { useNavigate } from 'react-router-dom';
import styles from './NavBar.module.scss';

export interface NavBarProps {
  title: string;
  onBack?: () => void;
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function NavBar({ title, onBack }: NavBarProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <header className={styles.navBar}>
      <button type="button" className={styles.back} onClick={handleBack} aria-label="返回">
        <BackIcon />
      </button>
      <h1 className={styles.title}>{title}</h1>
    </header>
  );
}
