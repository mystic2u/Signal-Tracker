import { useEffect, useRef, useState } from 'react';

const HOUR_MS = 60 * 60 * 1000;

// Turns "these articles just showed up" into rate-limited, per-category
// toasts, plus a session-only history log for the dropdown.
export function useNotifications(newlyArrived, notificationPreferences, clearNewlyArrived) {
  const [toasts, setToasts] = useState([]);
  const [history, setHistory] = useState([]);
  // categoryId -> array of timestamps an article was surfaced, for the
  // rolling one-hour cap.
  const sentLog = useRef({});

  useEffect(() => {
    if (!newlyArrived.length) return;

    const now = Date.now();
    const byCategory = {};
    newlyArrived.forEach((article) => {
      (article.category || []).forEach((cat) => {
        if (!byCategory[cat]) byCategory[cat] = [];
        byCategory[cat].push(article);
      });
    });

    const newToasts = [];
    const newHistoryEntries = [];

    Object.entries(byCategory).forEach(([categoryId, articles]) => {
      const pref = notificationPreferences[categoryId];
      if (!pref || !pref.enabled) return;

      const log = (sentLog.current[categoryId] || []).filter((t) => now - t < HOUR_MS);
      const remainingBudget = Math.max(0, pref.frequency - log.length);
      if (remainingBudget <= 0) return;

      const toShow = articles.slice(0, remainingBudget);
      sentLog.current[categoryId] = [...log, ...toShow.map(() => now)];

      const toast = {
        id: `toast-${categoryId}-${now}`,
        categoryId,
        count: toShow.length,
        frequency: pref.frequency,
        createdAt: now,
      };
      newToasts.push(toast);
      newHistoryEntries.push(toast);
    });

    if (newToasts.length) {
      setToasts((prev) => [...prev, ...newToasts]);
      setHistory((prev) => [...newHistoryEntries, ...prev]);
    }
    clearNewlyArrived();
  }, [newlyArrived, notificationPreferences, clearNewlyArrived]);

  const dismissToast = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return { toasts, dismissToast, history };
}
