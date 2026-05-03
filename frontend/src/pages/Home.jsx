import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "react-router-dom";
import BookList from "../components/BookList";
import useInfiniteBooks from "../hooks/useInfiniteBooks";
import "./Home.css";

const GENRES = ["전체", "SF", "판타지", "로맨스", "일상", "공포"];

const Home = () => {
  const location = useLocation();
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [genre, setGenre] = useState("전체");
  const sentinelRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchTerm(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const params = useMemo(
    () => (searchTerm ? { keyword: searchTerm } : {}),
    [searchTerm]
  );

  const { books, loading, error, hasMore, loadMore, retry } = useInfiniteBooks(params);

  const filteredBooks = useMemo(
    () => (genre === "전체" ? books : books.filter((b) => b.genre === genre)),
    [books, genre]
  );

  // 로그인 직후 진입 시 책 목록 재조회
  useEffect(() => {
    if (location.state?.justLoggedIn) {
      window.history.replaceState({}, document.title);
      retry();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Intersection Observer로 무한 스크롤
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1 className="home-hero-title">당신의 책 한 권,<br />지금 시작해요</h1>
        <p className="home-hero-sub">Remon에서 좋은 책을 만나보세요</p>

        <div className="home-search">
          <input
            type="text"
            placeholder="책 제목 또는 저자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="home-search-input"
          />
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="home-genre-select"
          >
            {GENRES.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">
          {searchTerm ? `"${searchTerm}" 검색 결과` : "추천 전자책"}
        </h2>

        {error ? (
          <div className="home-error">
            <p className="home-error-msg">{error}</p>
            <button className="home-retry-btn" onClick={retry}>다시 시도</button>
          </div>
        ) : (
          <>
            <BookList
              books={filteredBooks}
              loading={loading && books.length === 0}
              error={null}
              emptyMessage={searchTerm || genre !== "전체" ? "검색 결과가 없습니다." : "아직 등록된 책이 없습니다."}
            />

            {/* 무한 스크롤 sentinel */}
            <div ref={sentinelRef} className="home-sentinel" />

            {/* 추가 로딩 스피너 */}
            {loading && books.length > 0 && (
              <div className="home-load-more">
                <div className="home-load-spinner" />
              </div>
            )}

            {!hasMore && books.length > 0 && (
              <p className="home-end-msg">모든 책을 불러왔습니다 📚</p>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default Home;
