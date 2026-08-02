import { useState } from 'react';
import Toast from './Toast';
import { timeAgo } from '../utils/dateUtils';

export default function NotificationCenter({ toasts, dismissToast, history }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <Toast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>

      <div className="notif-center">
        <button
          type="button"
          className="notif-bell"
          onClick={() => setIsOpen((v) => !v)}
          aria-label="Notification history"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
            <path
              d="M12 3a5 5 0 00-5 5v3.2c0 .8-.28 1.58-.79 2.2L5 15h14l-1.21-1.6a3.6 3.6 0 01-.79-2.2V8a5 5 0 00-5-5z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M9.5 18a2.5 2.5 0 005 0" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          {history.length > 0 && <span className="notif-badge">{history.length}</span>}
        </button>

        {isOpen && (
          <div className="notif-dropdown">
            <div className="notif-dropdown-header">
              <span>This session</span>
              <button type="button" onClick={() => setIsOpen(false)} aria-label="Close">
                &times;
              </button>
            </div>
            {history.length === 0 ? (
              <p className="notif-empty">Nothing yet. New signals will show up here.</p>
            ) : (
              <ul className="notif-list">
                {history.map((h) => (
                  <li key={h.id}>
                    <span className={`freq-tag freq-tag--${h.categoryId}`}>{h.categoryId}</span>
                    <span>
                      {h.count} new article{h.count === 1 ? '' : 's'}
                    </span>
                    <span className="notif-time">{timeAgo(new Date(h.createdAt).toISOString())}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  );
}
