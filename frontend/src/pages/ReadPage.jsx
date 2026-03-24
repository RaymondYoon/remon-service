import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBookById, startReading } from "../api/bookApi";
import { isLoggedIn } from "../utils/auth";
import "./ReadPage.css";

const CHARS_PER_PAGE = 500;

function buildPages(content) {
  if (!content) return [];

  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  const pages = [];
  let current = [];
  let charCount = 0;

  for (const para of paragraphs) {
    if (charCount + para.length > CHARS_PER_PAGE && current.length > 0) {
      pages.push(current);
      current = [para];
      charCount = para.length;
    } else {
      current.push(para);
      charCount += para.length;
    }
  }

  if (current.length > 0) {
    pages.push(current);
  }

  return pages;
}

const ReadPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? null;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBookById(id);
        const data = response.data;
        setBook(data);
        setPages(buildPages(data.content));
        // 로그인 사용자: 서재에 담긴 책이면 READING으로 자동 전환 (DONE은 유지)
        if (isLoggedIn()) {
          startReading(id).catch(() => {});
        }
      } catch {
        setError("책 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
  }, [id]);

  const goNext = useCallback(() => {
    setCurrentPage((p) => Math.min(p + 1, pages.length - 1));
  }, [pages.length]);

  const goPrev = useCallback(() => {
    setCurrentPage((p) => Math.max(p - 1, 0));
  }, []);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  if (loading) {
    return (
      <div className="read-state">
        <div className="read-spinner" />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="read-state read-error">
        <p>😥 {error || "책을 찾을 수 없습니다."}</p>
        <button className="read-back-btn" onClick={() => navigate(-1)}>
          돌아가기
        </button>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="read-state">
        <p>본문이 없습니다.</p>
        <button className="read-back-btn" onClick={() => navigate(`/book/${id}`, { replace: true, state: { from } })}>
          ← 책 정보로
        </button>
      </div>
    );
  }

  const pageParagraphs = pages[currentPage];

  return (
    <div className="read-container">
      <div className="read-header">
        <button
          className="read-back-btn"
          onClick={() => navigate(`/book/${id}`, { replace: true, state: { from } })}
        >
          ← 책 정보로
        </button>
        <span className="read-title">{book.title}</span>
      </div>

      <div className="read-book">
        <div className="read-page">
          {pageParagraphs.map((para, i) => (
            <p key={i} className="read-para">
              {para}
            </p>
          ))}
        </div>

        <div className="read-nav">
          <button
            className="read-nav-btn"
            onClick={goPrev}
            disabled={currentPage === 0}
          >
            ← 이전
          </button>

          <span className="read-page-num">
            {currentPage + 1} / {pages.length}
          </span>

          <button
            className="read-nav-btn"
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
          >
            다음 →
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadPage;
