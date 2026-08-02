export default function FilterPanel({
  categories,
  selectedCategories,
  onToggleCategory,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  sortOrder,
  onSortOrderChange,
  resultCount,
  isOpen,
  onClose,
}) {
  if (!isOpen) return null;

  return (
    <div className="filter-panel">
      <div className="filter-panel-header">
        <h2>Filter &amp; sort</h2>
        <button type="button" className="filter-close" onClick={onClose} aria-label="Close filters">
          &times;
        </button>
      </div>

      <fieldset className="filter-group">
        <legend>Category</legend>
        <div className="filter-checkboxes">
          {categories.map((cat) => (
            <label key={cat.id} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.id)}
                onChange={() => onToggleCategory(cat.id)}
              />
              {cat.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Date range</legend>
        <div className="filter-dates">
          <label>
            From
            <input type="date" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          </label>
          <label>
            To
            <input type="date" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
          </label>
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Sort</legend>
        <div className="filter-radios">
          <label className="filter-checkbox">
            <input
              type="radio"
              name="sort"
              checked={sortOrder === 'newest'}
              onChange={() => onSortOrderChange('newest')}
            />
            Newest first
          </label>
          <label className="filter-checkbox">
            <input
              type="radio"
              name="sort"
              checked={sortOrder === 'oldest'}
              onChange={() => onSortOrderChange('oldest')}
            />
            Oldest first
          </label>
        </div>
      </fieldset>

      <p className="filter-count">{resultCount} article{resultCount === 1 ? '' : 's'} match</p>
    </div>
  );
}
