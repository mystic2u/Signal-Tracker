import { useEffect, useRef, useState } from 'react';
import { DATA_URL, POLL_INTERVAL_MS, STALE_DATA_HOURS } from '../utils/constants';

// Fetches data/articles.json, keeps it fresh by polling, and tells the rest
// of the app which articles are new since the last successful fetch (so
// NotificationCenter can raise toasts for them).
export function useArticles() {
  const [articles, setArticles] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'error'
  const [generatedAt, setGeneratedAt] = useState(null); // when the scraper last ran
  const [newlyArrived, setNewlyArrived] = useState([]);
  const knownIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchArticles() {
      try {
        const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
        const json = await res.json();
        if (cancelled) return;

        const list = Array.isArray(json) ? json : json.articles || [];
        const generated = Array.isArray(json) ? null : json.generatedAt || null;

        if (!isFirstLoad.current) {
          const fresh = list.filter((a) => !knownIds.current.has(a.id));
          if (fresh.length) setNewlyArrived(fresh);
        }

        list.forEach((a) => knownIds.current.add(a.id));
        setArticles(list);
        setGeneratedAt(generated);
        setStatus('ready');
        isFirstLoad.current = false;
      } catch (err) {
        console.warn('Could not load articles.json', err);
        if (!cancelled) setStatus((prev) => (prev === 'ready' ? prev : 'error'));
      }
    }

    fetchArticles();
    const interval = setInterval(fetchArticles, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const clearNewlyArrived = () => setNewlyArrived([]);

  const isStale =
    generatedAt !== null &&
    (Date.now() - new Date(generatedAt).getTime()) / 36e5 > STALE_DATA_HOURS;

  return { articles, status, lastUpdated: generatedAt, isStale, newlyArrived, clearNewlyArrived };
}
