import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./BookCard.css";

const BookCard = React.memo(({ book, isInLibrary }) => {
  const location = useLocation();

  return (
    <Link
      to={`/book/${book.id}`}
      state={{ from: location.pathname }}
      className="book-card"
    >
      <div className="book-cover">
        {book.coverImageUrl ? (
          <img
            src={book.coverImageUrl}
            alt={book.title}
            className="book-cover-img"
            loading="lazy"
            width="160"
            height="190"
          />
        ) : (
          <div className="book-cover-placeholder">
            <span className="book-cover-lemon">🍋</span>
          </div>
        )}
        {book.genre && <span className="book-genre-badge">{book.genre}</span>}
        {isInLibrary && <span className="book-library-badge">✓</span>}
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        {book.publishedBy ? (
          <Link
            to={`/profile/${book.publishedBy}`}
            className="book-author-link"
            onClick={(e) => e.stopPropagation()}
          >
            {book.author}
          </Link>
        ) : (
          <p className="book-author">{book.author}</p>
        )}
        {book.averageRating != null && (
          <p className="book-rating">⭐ {book.averageRating.toFixed(1)}</p>
        )}
      </div>
    </Link>
  );
});

export default BookCard;
