import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFeedBooks } from "../api/bookApi";
import "./FeedPage.css";

const FeedPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getFeedBooks()
      .then((res) => setBooks(Array.isArray(res.data) ? res.data : (res.data.content ?? [])))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  const authors = useMemo(() => {
    const map = new Map();
    books.forEach((book) => {
      if (book.publishedBy && !map.has(book.publishedBy)) {
        map.set(book.publishedBy, {
          id: book.publishedBy,
          nickname: book.authorNickname || book.author || "?",
        });
      }
    });
    return Array.from(map.values());
  }, [books]);

  if (loading) return <div className="feed-loading">불러오는 중...</div>;

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1 className="feed-title">피드</h1>
        <p className="feed-subtitle">내가 팔로우한 사람들의 새 책</p>
      </div>

      {books.length === 0 ? (
        <div className="feed-empty">
          <div className="feed-empty-icon">📚</div>
          <p className="feed-empty-text">아직 팔로우한 작가가 없어요.</p>
          <p className="feed-empty-hint">
            둘러보기에서 마음에 드는 작가를 팔로우해보세요!
          </p>
          <button className="feed-empty-btn" onClick={() => navigate("/explore")}>
            둘러보기 →
          </button>
        </div>
      ) : (
        <>
          {/* 팔로잉 작가 아바타 목록 */}
          <div className="feed-authors">
            {authors.map((author) => (
              <Link
                to={`/profile/${author.id}`}
                key={author.id}
                className="feed-author-item"
              >
                <div className="feed-author-avatar">
                  {author.nickname.charAt(0).toUpperCase()}
                </div>
                <span className="feed-author-name">{author.nickname}</span>
              </Link>
            ))}
          </div>

          {/* 책 그리드 */}
          <div className="feed-grid">
            {books.map((book) => (
              <div key={book.id} className="feed-card">
                <Link to={`/book/${book.id}`} className="feed-card-link">
                  <div className="feed-card-cover">
                    {book.coverImageUrl
                      ? <img src={book.coverImageUrl} alt={book.title} className="feed-card-img" />
                      : <span className="feed-card-emoji">🍋</span>
                    }
                  </div>
                  <div className="feed-card-body">
                    {book.genre && (
                      <span className="feed-card-genre">{book.genre}</span>
                    )}
                    <h3 className="feed-card-title">{book.title}</h3>
                  </div>
                </Link>
                <div className="feed-card-footer">
                  <Link
                    to={`/profile/${book.publishedBy}`}
                    className="feed-card-author"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ✍️ {book.authorNickname || book.author || "알 수 없음"}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default FeedPage;
