import { type ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './Modal.module.scss';

export interface ModalProps {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  footer?: ReactNode;
  maskClosable?: boolean;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
  maskClosable = true,
  confirmText = '确定',
  cancelText = '取消',
  onConfirm,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleMaskClick = () => {
    if (maskClosable) onClose?.();
  };

  const defaultFooter =
    onConfirm || onClose ? (
      <div className={styles.footer}>
        {onClose && (
          <button type="button" className={`${styles.footerBtn} ${styles.footerDefault}`} onClick={onClose}>
            {cancelText}
          </button>
        )}
        {onConfirm && (
          <button
            type="button"
            className={`${styles.footerBtn} ${styles.footerPrimary}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        )}
      </div>
    ) : null;

  return createPortal(
    <div className={styles.overlay} onClick={handleMaskClick} role="presentation">
      <div
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <header className={styles.header}>
            <h2 id="modal-title" className={styles.title}>
              {title}
            </h2>
          </header>
        )}
        {children && <div className={styles.body}>{children}</div>}
        {footer ?? defaultFooter}
      </div>
    </div>,
    document.body,
  );
}
