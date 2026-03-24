import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBookById, startReading, savePage, markAsDone } from "../api/bookApi";
import { isLoggedIn } from "../utils/auth";
import "./ReadPage.css";

const CHARS_PER_PAGE = 500;
const SAVE_DEBOUNCE_MS = 1500;

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

const LS_KEY = (id) => `remon_page_${id}`;

const ReadPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? null;
  const initialPage = location.state?.lastReadPage ?? null;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);

  const saveTimer = useRef(null);
  const loggedIn = isLoggedIn();

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBookById(id);
        const data = response.data;
        setBook(data);
        const built = buildPages(data.content);
        setPages(built);

        // 이어서 보기: state > localStorage > 0
        const lsPage = parseInt(localStorage.getItem(LS_KEY(id)) ?? "", 10);
        const startPage = initialPage != null
          ? Math.min(initialPage, Math.max(built.length - 1, 0))
          : !isNaN(lsPage)
            ? Math.min(lsPage, Math.max(built.length - 1, 0))
            : 0;
        setCurrentPage(startPage);

        if (loggedIn) {
          startReading(id).catch(() => {});
        }
      } catch {
        setError("책 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 페이지 바뀔 때마다 localStorage + 백엔드 저장
  useEffect(() => {
    if (pages.length === 0) return;

    localStorage.setItem(LS_KEY(id), String(currentPage));

    if (loggedIn) {
      // 완독 처리
      if (currentPage === pages.length - 1) {
        markAsDone(id).catch(() => {});
      }

      // 페이지 저장 디바운스
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        savePage(id, currentPage).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [currentPage, pages.length, id, loggedIn]);

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
