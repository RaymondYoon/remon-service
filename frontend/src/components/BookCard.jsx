import React from "react";
import { Link } from "react-router-dom";
import "./BookCard.css";

const BookCard = ({ book }) => {
  return (
    <div className="book-card">
      <div
        className="book-cover"
        style={book.coverImage ? { backgroundImage: `url(${book.coverImage})` } : {}}
      >
        {!book.coverImage && (
          <span className="book-cover-placeholder">📖</span>
        )}
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>
      </div>

      {/* 버그 수정: 작은따옴표 → 백틱(템플릿 리터럴) */}
      <Link to={`/book/${book.id}`} className="detail-btn">
        자세히 보기
      </Link>
    </div>
  );
};

export default BookCard;
