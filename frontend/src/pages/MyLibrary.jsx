import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getMyLibrary } from "../api/bookApi";
import BookList from "../components/BookList";
import { getUser } from "../utils/auth";
import "./MyLibrary.css";

const MyLibrary = () => {
  const navigate = useNavigate();
  const user = getUser();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyLibrary();
        const data = response.data;
        setBooks(Array.isArray(data) ? data : (data.content ?? []));
      } catch {
        setError("서재를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  return (
    <div className="library-container">
      <div className="library-header">
        <h2 className="library-title">
          {user?.nickname ? `${user.nickname}님의 서재` : "내 서재"}
        </h2>
        <p className="library-sub">담아둔 책들을 모아 볼 수 있어요</p>
      </div>

      {/* 독서 통계 영역 - 추후 백엔드 지원 시 연결 예정 */}
      <div className="library-stats">
        <div className="stat-card">
          <span className="stat-num">{books.length}</span>
          <span className="stat-label">담은 책</span>
        </div>
        <div className="stat-card stat-coming">
          <span className="stat-num">—</span>
          <span className="stat-label">읽은 책 (준비중)</span>
        </div>
        <div className="stat-card stat-coming">
          <span className="stat-num">—</span>
          <span className="stat-label">읽는 중 (준비중)</span>
        </div>
      </div>

      <section className="library-section">
        <BookList
          books={books}
          loading={loading}
          error={error}
          emptyMessage="아직 담은 책이 없어요. 책을 찾아 서재에 담아보세요!"
        />

        {!loading && !error && books.length === 0 && (
          <div className="library-empty-action">
            <button className="library-browse-btn" onClick={() => navigate("/")}>
              책 둘러보기
            </button>
          </div>
        )}
      </section>
    </div>
  );
};

export default MyLibrary;
