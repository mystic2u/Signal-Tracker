import { useSwipe } from '../hooks/useSwipe';
import { timeAgo } from '../utils/dateUtils';

export default function Card({ article, isSaved, onSave, onUnsave, onDismiss, savedMeta }) {
  const { dragX, isDragging, swipeHandlers } = useSwipe({
    onSwipeLeft: () => onDismiss(article.id),
    onSwipeRight: () => onSave(article.id),
  });

  const openSource = () => window.open(article.url, '_blank', 'noopener,noreferrer');

  const rotation = dragX / 20;
  const revealDirection = dragX > 0 ? 'save' : dragX < 0 ? 'dismiss' : null;

  return (
    <div className="card-shell">
      {revealDirection && (
        <div className={`card-reveal card-reveal--${revealDirection}`}>
          {revealDirection === 'save' ? 'Save' : 'Dismiss'}
        </div>
      )}
      <article
        className="card"
        style={{
          transform: `translateX(${dragX}px) rotate(${rotation}deg)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease',
        }}
        {...swipeHandlers}
      >
        <div className="card-top">
          <div className="card-tags">
            {(article.category || []).map((cat) => (
              <span key={cat} className={`freq-tag freq-tag--${cat}`}>
                {cat}
              </span>
            ))}
          </div>
          <span className="card-time">
            <span className="pulse-dot" aria-hidden="true" />
            {timeAgo(article.datePublished)}
          </span>
        </div>

        {article.imageUrl && (
          <div className="card-image" onClick={openSource}>
            <img src={article.imageUrl} alt="" loading="lazy" />
          </div>
        )}

        <h3 className="card-title" onClick={openSource}>
          {article.title}
        </h3>
        {article.description && <p className="card-desc">{article.description}</p>}

        <div className="card-footer">
          <span className="card-source">{article.source}</span>
          <div className="card-actions">
            <button
              type="button"
              className="card-btn card-btn--dismiss"
              onClick={() => onDismiss(article.id)}
              aria-label="Dismiss"
            >
              Dismiss
            </button>
            <button
              type="button"
              className={`card-btn card-btn--save ${isSaved ? 'is-active' : ''}`}
              onClick={() => (isSaved ? onUnsave(article.id) : onSave(article.id))}
            >
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
        {savedMeta && <div className="card-saved-meta">Saved {timeAgo(savedMeta.savedDate)}</div>}
      </article>
    </div>
  );
}
