import { useState } from 'react';
import Card from './Card';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import { exportArticlesToCsv } from '../utils/export';

export default function SavedItems({
  articles,
  savedMetaById,
  categories,
  filters,
  onSearch,
  onToggleCategory,
  onDateFromChange,
  onDateToChange,
  onSortOrderChange,
  onUnsave,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <div className="view">
      <div className="toolbar">
        <SearchBar onSearch={onSearch} resultCount={articles.length} showCount />
        <button type="button" className="toolbar-btn" onClick={() => setIsFilterOpen(true)}>
          Filters
        </button>
        <button
          type="button"
          className="toolbar-btn"
          onClick={() => exportArticlesToCsv(articles, 'signal-tracker-saved.csv')}
        >
          Export CSV
        </button>
      </div>

      <FilterPanel
        categories={categories}
        selectedCategories={filters.selectedCategories}
        onToggleCategory={onToggleCategory}
        dateFrom={filters.dateFrom}
        dateTo={filters.dateTo}
        onDateFromChange={onDateFromChange}
        onDateToChange={onDateToChange}
        sortOrder={filters.sortOrder}
        onSortOrderChange={onSortOrderChange}
        resultCount={articles.length}
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
      />

      {articles.length === 0 ? (
        <div className="empty-state">
          <p>Nothing saved yet. Swipe right or hit Save on a card to keep it here.</p>
        </div>
      ) : (
        <div className="card-list">
          {articles.map((article) => (
            <Card
              key={article.id}
              article={article}
              isSaved
              onSave={() => {}}
              onUnsave={onUnsave}
              onDismiss={onUnsave}
              savedMeta={savedMetaById[article.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
