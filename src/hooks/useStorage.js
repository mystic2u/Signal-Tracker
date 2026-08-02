import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEY, DEFAULT_STORAGE } from '../utils/constants';

function loadFromDisk() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(DEFAULT_STORAGE);
    const parsed = JSON.parse(raw);
    // Merge with defaults so new fields introduced later don't crash old data.
    return {
      settings: {
        notificationPreferences: {
          ...DEFAULT_STORAGE.settings.notificationPreferences,
          ...(parsed.settings?.notificationPreferences || {}),
        },
        customCategories: parsed.settings?.customCategories || [],
      },
      userSources: parsed.userSources || [],
      savedItems: parsed.savedItems || [],
      dismissedItems: parsed.dismissedItems || [],
    };
  } catch (err) {
    console.warn('Could not read saved data, starting fresh.', err);
    return structuredClone(DEFAULT_STORAGE);
  }
}

// Wraps all of localStorage in one hook so nothing else in the app has to
// know or care that it's localStorage under the hood.
export function useStorage() {
  const [data, setData] = useState(loadFromDisk);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (err) {
      console.warn('Could not save data locally.', err);
    }
  }, [data]);

  const updateNotificationPref = useCallback((categoryId, patch) => {
    setData((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        notificationPreferences: {
          ...prev.settings.notificationPreferences,
          [categoryId]: { ...prev.settings.notificationPreferences[categoryId], ...patch },
        },
      },
    }));
  }, []);

  const addCustomCategory = useCallback((name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setData((prev) => {
      if (prev.settings.customCategories.includes(trimmed)) return prev;
      return {
        ...prev,
        settings: {
          ...prev.settings,
          customCategories: [...prev.settings.customCategories, trimmed],
        },
      };
    });
  }, []);

  const addUserSource = useCallback((source) => {
    setData((prev) => ({
      ...prev,
      userSources: [...prev.userSources, { id: `user-source-${Date.now()}`, ...source }],
    }));
  }, []);

  const removeUserSource = useCallback((id) => {
    setData((prev) => ({
      ...prev,
      userSources: prev.userSources.filter((s) => s.id !== id),
    }));
  }, []);

  const saveItem = useCallback((articleId, notes = '') => {
    setData((prev) => {
      if (prev.savedItems.some((s) => s.id === articleId)) return prev;
      return {
        ...prev,
        savedItems: [
          ...prev.savedItems,
          { id: articleId, savedDate: new Date().toISOString(), notes },
        ],
      };
    });
  }, []);

  const unsaveItem = useCallback((articleId) => {
    setData((prev) => ({
      ...prev,
      savedItems: prev.savedItems.filter((s) => s.id !== articleId),
    }));
  }, []);

  const isSaved = useCallback(
    (articleId) => data.savedItems.some((s) => s.id === articleId),
    [data.savedItems]
  );

  const dismissItem = useCallback((articleId) => {
    setData((prev) => {
      if (prev.dismissedItems.includes(articleId)) return prev;
      return { ...prev, dismissedItems: [...prev.dismissedItems, articleId] };
    });
  }, []);

  const isDismissed = useCallback(
    (articleId) => data.dismissedItems.includes(articleId),
    [data.dismissedItems]
  );

  return {
    settings: data.settings,
    userSources: data.userSources,
    savedItems: data.savedItems,
    dismissedItems: data.dismissedItems,
    updateNotificationPref,
    addCustomCategory,
    addUserSource,
    removeUserSource,
    saveItem,
    unsaveItem,
    isSaved,
    dismissItem,
    isDismissed,
  };
}
