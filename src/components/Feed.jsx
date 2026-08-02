import { useState } from 'react';
import Card from './Card';
import SearchBar from './SearchBar';
import FilterPanel from './FilterPanel';
import { exportArticlesToCsv } from '../utils/export';

const PAGE_SIZE = 20;

export default function Feed({
  articles,
  categories,
  filters,
  onSearch,
  onToggleCategory,
  onDateFromChange,
  onDateToChange,
  onSortOrderChange,
  isSaved,
  onSave,
  onUnsave,
  onDismiss,
}) {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const visible = articles.slice(0, visibleCount);

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
          onClick={() => exportArticlesToCsv(articles, 'signal-tracker-feed.csv')}
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
          <p>No results. Try widening your filters or clearing search.</p>
        </div>
      ) : (
        <>
          <div className="card-list">
            {visible.map((article) => (
              <Card
                key={article.id}
                article={article}
                isSaved={isSaved(article.id)}
                onSave={onSave}
                onUnsave={onUnsave}
                onDismiss={onDismiss}
              />
            ))}
          </div>
          {visibleCount < articles.length && (
            <button
              type="button"
              className="load-more"
              onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
            >
              Load more ({articles.length - visibleCount} remaining)
            </button>
          )}
        </>
      )}
    </div>
  );
}
