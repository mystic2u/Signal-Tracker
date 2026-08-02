import { useState } from 'react';

export default function SettingsPanel({
  categories,
  notificationPreferences,
  onUpdateNotificationPref,
  customCategories,
  onAddCustomCategory,
  userSources,
  onAddUserSource,
  onRemoveUserSource,
}) {
  const [newCategory, setNewCategory] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceType, setSourceType] = useState('rss');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceCategories, setSourceCategories] = useState([]);

  const allCategoryIds = [...categories.map((c) => c.id), ...customCategories];

  const handleAddCategory = (e) => {
    e.preventDefault();
    onAddCustomCategory(newCategory);
    setNewCategory('');
  };

  const handleToggleSourceCategory = (id) => {
    setSourceCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleAddSource = (e) => {
    e.preventDefault();
    if (!sourceUrl.trim()) return;
    onAddUserSource({
      name: sourceName.trim() || sourceUrl.trim(),
      type: sourceType,
      url: sourceUrl.trim(),
      categories: sourceCategories,
    });
    setSourceName('');
    setSourceUrl('');
    setSourceCategories([]);
  };

  return (
    <div className="view settings-view">
      <section className="settings-section">
        <h2>Notifications</h2>
        <p className="settings-hint">
          Choose which categories can raise a toast, and cap how many articles per hour.
        </p>
        <div className="notif-settings-list">
          {categories.map((cat) => {
            const pref = notificationPreferences[cat.id] || { enabled: false, frequency: 5 };
            return (
              <div key={cat.id} className="notif-setting-row">
                <label className="notif-setting-toggle">
                  <input
                    type="checkbox"
                    checked={pref.enabled}
                    onChange={(e) => onUpdateNotificationPref(cat.id, { enabled: e.target.checked })}
                  />
                  {cat.label}
                </label>
                <label className="notif-setting-freq">
                  max
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={pref.frequency}
                    onChange={(e) =>
                      onUpdateNotificationPref(cat.id, { frequency: Number(e.target.value) || 1 })
                    }
                  />
                  / hour
                </label>
              </div>
            );
          })}
        </div>
      </section>

      <section className="settings-section">
        <h2>Custom categories</h2>
        <form className="inline-form" onSubmit={handleAddCategory}>
          <input
            type="text"
            placeholder="e.g. climate, retail"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          />
          <button type="submit" className="toolbar-btn">Add</button>
        </form>
        {customCategories.length > 0 && (
          <div className="chip-row">
            {customCategories.map((c) => (
              <span key={c} className="freq-tag">{c}</span>
            ))}
          </div>
        )}
      </section>

      <section className="settings-section">
        <h2>Add a source</h2>
        <p className="settings-hint">
          Add an RSS feed URL, or a website/newsletter link to track manually. The scraper
          picks up new RSS feeds on its next run.
        </p>
        <form className="source-form" onSubmit={handleAddSource}>
          <label>
            Name
            <input
              type="text"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              placeholder="My tech newsletter"
            />
          </label>
          <label>
            Type
            <select value={sourceType} onChange={(e) => setSourceType(e.target.value)}>
              <option value="rss">RSS feed</option>
              <option value="website">Website</option>
              <option value="newsletter">Newsletter</option>
            </select>
          </label>
          <label>
            URL
            <input
              type="url"
              required
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://example.com/feed.xml"
            />
          </label>
          <fieldset className="filter-group">
            <legend>Categories</legend>
            <div className="filter-checkboxes">
              {allCategoryIds.map((id) => (
                <label key={id} className="filter-checkbox">
                  <input
                    type="checkbox"
                    checked={sourceCategories.includes(id)}
                    onChange={() => handleToggleSourceCategory(id)}
                  />
                  {id}
                </label>
              ))}
            </div>
          </fieldset>
          <button type="submit" className="toolbar-btn">Add source</button>
        </form>

        {userSources.length > 0 && (
          <ul className="source-list">
            {userSources.map((s) => (
              <li key={s.id}>
                <div>
                  <strong>{s.name}</strong>
                  <span className="source-meta">{s.type} · {s.url}</span>
                </div>
                <button type="button" className="link-btn" onClick={() => onRemoveUserSource(s.id)}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="settings-hint">
          Note: sources you add here live in your browser only. To have the hourly scraper
          pick them up, add them to <code>sources.json</code> in the repo and push — see the
          README for the exact steps.
        </p>
      </section>
    </div>
  );
}
