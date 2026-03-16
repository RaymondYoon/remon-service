import React from "react";
import BookCard from "./BookCard";
import "./BookList.css";

const BookList = ({ books, loading, error, emptyMessage = "책이 없습니다." }) => {
  if (loading) {
    return (
      <div className="booklist-state">
        <div className="booklist-spinner" />
        <p>불러오는 중...</p>
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
        <BookCard key={book.id} book={book} />
      ))}
    </div>
  );
};

export default BookList;
