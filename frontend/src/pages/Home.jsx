import React, { useState } from "react";
import BookList from "../components/BookList";
import useBooks from "../hooks/useBooks";
import "./Home.css";

const Home = () => {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { books, loading, error } = useBooks(searchTerm ? { keyword: searchTerm } : {});

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(query.trim());
  };

  return (
    <div className="home-container">
      <section className="home-hero">
        <h1 className="home-hero-title">당신의 책 한 권,<br />지금 시작해요</h1>
        <p className="home-hero-sub">Remon에서 좋은 책을 만나보세요</p>

        <form className="home-search" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="책 제목 또는 저자 검색"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="home-search-input"
          />
          <button type="submit" className="home-search-btn">검색</button>
        </form>
      </section>

      <section className="home-section">
        <h2 className="home-section-title">
          {searchTerm ? `"${searchTerm}" 검색 결과` : "추천 전자책"}
        </h2>

        <BookList
          books={books}
          loading={loading}
          error={error}
          emptyMessage={searchTerm ? "검색 결과가 없습니다." : "아직 등록된 책이 없습니다."}
        />
      </section>
    </div>
  );
};

export default Home;
