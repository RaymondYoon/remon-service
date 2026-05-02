import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./BookCard.css";

const BookCard = React.memo(({ book }) => {
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
          />
        ) : (
          <span className="book-cover-placeholder">📖</span>
        )}
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
