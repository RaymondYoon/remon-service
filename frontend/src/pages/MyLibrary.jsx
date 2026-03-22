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
        const raw = Array.isArray(data) ? data : (data.content ?? []);
        // LibraryResponse → BookCard 호환 형태로 변환
        // - id: bookId (BookCard의 /book/:id 링크에 사용)
        // - coverImage: coverImageUrl (BookCard가 기대하는 필드명)
        const mapped = raw.map((item) => ({
          id: item.bookId,
          title: item.title,
          author: item.author,
          coverImage: item.coverImageUrl,
          genre: item.genre,
          status: item.status,
        }));
        setBooks(mapped);
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

      <div className="library-stats">
        <div className="stat-card">
          <span className="stat-num">{books.length}</span>
          <span className="stat-label">전체</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{books.filter(b => b.status === "READING").length}</span>
          <span className="stat-label">읽는 중</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{books.filter(b => b.status === "DONE").length}</span>
          <span className="stat-label">완독</span>
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
