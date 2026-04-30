import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getFeedBooks } from "../api/bookApi";
import "./FeedPage.css";

const FeedPage = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getFeedBooks()
      .then((res) => setBooks(res.data))
      .catch(() => setBooks([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="feed-loading">불러오는 중...</div>;

  return (
    <div className="feed-page">
      <div className="feed-header">
        <h1 className="feed-title">피드</h1>
        <p className="feed-subtitle">내가 팔로우한 사람들의 새 책</p>
      </div>

      {books.length === 0 ? (
        <div className="feed-empty">
          <p>아직 피드가 없습니다.</p>
          <p className="feed-empty-hint">
            <span
              className="feed-empty-link"
              onClick={() => navigate("/explore")}
            >
              둘러보기
            </span>
            에서 사람들을 팔로우해보세요!
          </p>
        </div>
      ) : (
        <div className="feed-list">
          {books.map((book) => (
            <Link to={`/book/${book.id}`} key={book.id} className="feed-item">
              <div className="feed-item-meta">
                <Link
                  to={`/profile/${book.publishedBy}`}
                  className="feed-item-author"
                  onClick={(e) => e.stopPropagation()}
                >
                  {book.authorNickname || book.author || "알 수 없음"}
                </Link>
                {book.genre && (
                  <span className="feed-item-genre">{book.genre}</span>
                )}
              </div>
              <h3 className="feed-item-title">{book.title}</h3>
              {book.description && (
                <p className="feed-item-desc">
                  {book.description.slice(0, 100)}
                  {book.description.length > 100 ? "..." : ""}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default FeedPage;
