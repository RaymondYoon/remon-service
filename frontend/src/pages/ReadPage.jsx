import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBookById, startReading, savePage, markAsDone } from "../api/bookApi";
import { isLoggedIn } from "../utils/auth";
import "./ReadPage.css";

const CHARS_PER_PAGE = 500;
const SAVE_DEBOUNCE_MS = 1500;

function cleanContent(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")         // **bold** → 일반 텍스트
    .replace(/\*(.+?)\*/g, "$1")              // *italic* → 일반 텍스트
    .replace(/^[ \t]*[*\-]{3,}[ \t]*$/gm, "") // --- / *** 구분선 제거
    .replace(/^[ \t]*\.\.\.[ \t]*$/gm, "…")  // 단독 줄 ... → …
    .replace(/\n{3,}/g, "\n\n")               // 연속 빈 줄 정리
    .trim();
}

function buildPages(content) {
  if (!content) return [];

  const cleaned = cleanContent(content);

  const paragraphs = cleaned
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
  const [animClass, setAnimClass] = useState("page-enter-next"); // 초기 진입

  const saveTimer = useRef(null);
  const animTimer = useRef(null);
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

  useEffect(() => {
    if (pages.length === 0) return;

    localStorage.setItem(LS_KEY(id), String(currentPage));

    if (loggedIn) {
      if (currentPage === pages.length - 1) {
        markAsDone(id).catch(() => {});
      }
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        savePage(id, currentPage).catch(() => {});
      }, SAVE_DEBOUNCE_MS);
    }

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [currentPage, pages.length, id, loggedIn]);

  const changePage = useCallback((updater, direction) => {
    const outClass = direction === "next" ? "page-exit-next" : "page-exit-prev";
    const inClass  = direction === "next" ? "page-enter-next" : "page-enter-prev";

    setAnimClass(outClass);

    if (animTimer.current) clearTimeout(animTimer.current);
    animTimer.current = setTimeout(() => {
      setCurrentPage(updater);
      setAnimClass(inClass);
    }, 280);
  }, []);

  const goNext = useCallback(() => {
    changePage((p) => Math.min(p + 1, pages.length - 1), "next");
  }, [changePage, pages.length]);

  const goPrev = useCallback(() => {
    changePage((p) => Math.max(p - 1, 0), "prev");
  }, [changePage]);

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
          ← 돌아가기
        </button>
        <span className="read-title">{book.title}</span>
      </div>
      <div className="read-progress-bar">
        <div
          className="read-progress-fill"
          style={{ width: `${((currentPage + 1) / pages.length) * 100}%` }}
        />
      </div>

      <div className="read-book">
        <div className="read-page-viewport">
          <div className={`read-page ${animClass}`}>
            {pageParagraphs.map((para, i) => (
              <p key={i} className="read-para">
                {para}
              </p>
            ))}
          </div>
        </div>

        <div className="read-nav">
          <button
            className="read-nav-btn"
            onClick={goPrev}
            disabled={currentPage === 0}
          >
            이전 페이지
          </button>

          <span className="read-page-num">
            {currentPage + 1} / {pages.length}
          </span>

          <button
            className="read-nav-btn"
            onClick={goNext}
            disabled={currentPage === pages.length - 1}
          >
            다음 페이지
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadPage;
