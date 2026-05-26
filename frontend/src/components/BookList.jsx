import React from "react";
import BookCard from "./BookCard";
import "./BookList.css";

const SkeletonCard = () => (
  <div className="skeleton-card">
    <div className="skeleton-cover" />
    <div className="skeleton-line skeleton-title" />
    <div className="skeleton-line skeleton-author" />
    <div className="skeleton-line skeleton-rating" />
  </div>
);

const BookList = React.memo(({ books, loading, error, emptyMessage = "책이 없습니다.", libraryIds }) => {
  if (loading) {
    return (
      <div className="booklist-grid">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="booklist-state booklist-error">
        <p>😥 {error}</p>
      </div>
    );
  }

  if (!books || books.length === 0) {
    return (
      <div className="booklist-state">
        <p className="booklist-empty">📚 {emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="booklist-grid">
      {books.map((book) => (
        <BookCard key={book.id} book={book} isInLibrary={libraryIds?.has(book.id)} />
      ))}
    </div>
  );
});

export default BookList;
