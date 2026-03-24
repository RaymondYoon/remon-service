import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getMyBooks, deleteMyBook } from "../api/bookApi";
import "./MyBooks.css";

const MyBooks = () => {
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getMyBooks();
        setBooks(res.data ?? []);
      } catch {
        setError("책 목록을 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const handleDelete = async (bookId) => {
    if (!window.confirm("이 책을 삭제할까요? 되돌릴 수 없습니다.")) return;
    try {
      await deleteMyBook(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch {
      alert("삭제에 실패했습니다. 다시 시도해주세요.");
    }
  };

  return (
    <div className="mybooks-container">
      <div className="mybooks-header">
        <h2 className="mybooks-title">내가 만든 책</h2>
        <p className="mybooks-sub">AI로 생성한 나의 작품들이에요</p>
      </div>

      {loading && (
        <div className="mybooks-state">
          <div className="mybooks-spinner" />
          <p>불러오는 중...</p>
        </div>
      )}

      {!loading && error && (
        <div className="mybooks-state mybooks-error">
          <p>😥 {error}</p>
        </div>
      )}

      {!loading && !error && books.length === 0 && (
        <div className="mybooks-state">
          <p className="mybooks-empty-msg">아직 만든 책이 없어요.</p>
          <button className="mybooks-generate-btn" onClick={() => navigate("/generate")}>
            ✨ 책 만들러 가기
          </button>
        </div>
      )}

      {!loading && !error && books.length > 0 && (
        <div className="mybooks-grid">
          {books.map((book) => (
            <div key={book.id} className="mybooks-card">
              <div
                className="mybooks-cover"
                style={book.coverImageUrl ? { backgroundImage: `url(${book.coverImageUrl})` } : {}}
              >
                {!book.coverImageUrl && <span className="mybooks-cover-placeholder">📖</span>}
                {book.genre && <span className="mybooks-genre-badge">{book.genre}</span>}
              </div>

              <div className="mybooks-info">
                <h3 className="mybooks-book-title">{book.title}</h3>
                <p className="mybooks-book-author">{book.author}</p>
                {book.description && (
                  <p className="mybooks-book-desc">{book.description}</p>
                )}
              </div>

              <div className="mybooks-actions">
                <Link
                  to={`/book/${book.id}`}
                  state={{ from: "/my-books" }}
                  className="mybooks-detail-btn"
                >
                  자세히 보기
                </Link>
                <button
                  className="mybooks-delete-btn"
                  onClick={() => handleDelete(book.id)}
                >
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBooks;
