import React, { useState, useEffect } from "react";
import BookList from "../components/BookList";
import useBooks from "../hooks/useBooks";
import "./Home.css";

const GENRES = ["전체", "SF", "판타지", "로맨스", "일상", "공포"];

const Home = () => {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [genre, setGenre] = useState("전체");
  const { books, loading, error } = useBooks(searchTerm ? { keyword: searchTerm } : {});

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(query.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filteredBooks = genre === "전체" ? books : books.filter((b) => b.genre === genre);

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

        <BookList
          books={filteredBooks}
          loading={loading}
          error={error}
          emptyMessage={searchTerm || genre !== "전체" ? "검색 결과가 없습니다." : "아직 등록된 책이 없습니다."}
        />
      </section>
    </div>
  );
};

export default Home;
