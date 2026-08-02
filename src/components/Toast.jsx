import { useEffect } from 'react';

const AUTO_DISMISS_MS = 5000;

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <span className="pulse-dot" aria-hidden="true" />
      <span className="toast-text">
        {toast.count} new article{toast.count === 1 ? '' : 's'} in{' '}
        <strong>{toast.categoryId}</strong> (max {toast.frequency}/hour)
      </span>
      <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
        &times;
      </button>
    </div>
  );
}
