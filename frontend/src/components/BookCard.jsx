import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./BookCard.css";

const GENRE_GRADIENTS = {
  "SF": "linear-gradient(135deg, #3b82f6, #8b5cf6)",
  "판타지": "linear-gradient(135deg, #10b981, #06b6d4)",
  "로맨스": "linear-gradient(135deg, #f472b6, #ef4444)",
  "일상": "linear-gradient(135deg, #fbbf24, #f97316)",
  "공포": "linear-gradient(135deg, #1c1c1c, #dc2626)",
};
const DEFAULT_GRADIENT = "linear-gradient(135deg, #5b7e5a, #f5c842)";

const BookCard = React.memo(({ book, isInLibrary }) => {
  const location = useLocation();

  return (
    <div className="book-card">
      <div className="book-cover">
        {book.coverImage ? (
          <img
            src={book.coverImage}
            alt={book.title}
            className="book-cover-img"
            loading="lazy"
            width="160"
            height="190"
          />
        ) : (
          <div
            className="book-cover-gradient"
            style={{ background: GENRE_GRADIENTS[book.genre] || DEFAULT_GRADIENT }}
          >
            <span className="book-cover-genre-label">{book.genre || "Remon"}</span>
          </div>
        )}
        {isInLibrary && <span className="book-library-badge">✓</span>}
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
        {book.averageRating != null && (
          <p className="book-rating">⭐ {book.averageRating.toFixed(1)}</p>
        )}
      </div>

      <Link
        to={`/book/${book.id}`}
        state={{ from: location.pathname }}
        className="detail-btn"
      >
        자세히 보기
      </Link>
    </div>
  );
});

export default BookCard;
