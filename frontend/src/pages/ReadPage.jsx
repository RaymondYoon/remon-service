import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { getBookById, startReading, savePage, markAsDone } from "../api/bookApi";
import { isLoggedIn, getUser } from "../utils/auth";
import "./ReadPage.css";

const CHARS_PER_PAGE = 500;
const SAVE_DEBOUNCE_MS = 1500;

function cleanContent(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/^[ \t]*[*-]{3,}[ \t]*$/gm, "")
    .replace(/^[ \t]*\.\.\.[ \t]*$/gm, "…")
    .replace(/\n{3,}/g, "\n\n")
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
  if (current.length > 0) pages.push(current);
  return pages;
}

// 계정마다 다른 페이지 저장: 이메일을 userId로 사용
const LS_KEY = (email, bookId) =>
  email ? `remon_page_${email}_${bookId}` : `remon_page_${bookId}`;

// HTMLFlipBook은 자식이 반드시 forwardRef 컴포넌트여야 함
const BookPage = React.forwardRef(({ paragraphs, pageNum, totalPages }, ref) => (
  <div className="flip-page" ref={ref}>
    <div className="flip-page-inner">
      <div className="flip-page-content">
        {paragraphs.map((para, i) => (
          <p key={i} className="read-para">{para}</p>
        ))}
      </div>
      <span className="flip-page-num">{pageNum} / {totalPages}</span>
    </div>
  </div>
));
BookPage.displayName = "BookPage";

function getPageDimensions() {
  const vw = window.innerWidth;
  if (vw < 640) {
    const w = Math.min(vw - 32, 340);
    return { width: w, height: Math.round(w * 1.52), isMobile: true };
  }
  return { width: 370, height: 560, isMobile: false };
}

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
  const [startPage, setStartPage] = useState(0);
  const [dim] = useState(getPageDimensions);

  const bookRef = useRef(null);
  const saveTimer = useRef(null);
  const totalPagesRef = useRef(0);
  const loggedIn = isLoggedIn();
  const userEmail = getUser()?.email ?? null;

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
        totalPagesRef.current = built.length;

        const lsPage = parseInt(localStorage.getItem(LS_KEY(userEmail, id)) ?? "", 10);
        const sp =
          initialPage != null
            ? Math.min(initialPage, Math.max(built.length - 1, 0))
            : !isNaN(lsPage)
            ? Math.min(lsPage, Math.max(built.length - 1, 0))
            : 0;
        setStartPage(sp);
        setCurrentPage(sp);

        if (loggedIn) startReading(id).catch(() => {});
      } catch {
        setError("책 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchBook();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onFlip = useCallback(
    (e) => {
      const page = e.data;
      setCurrentPage(page);
      localStorage.setItem(LS_KEY(userEmail, id), String(page));

      if (loggedIn) {
        if (page === totalPagesRef.current - 1) markAsDone(id).catch(() => {});
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(
          () => savePage(id, page).catch(() => {}),
          SAVE_DEBOUNCE_MS
        );
      }
    },
    [id, loggedIn, userEmail]
  );

  const goNext = useCallback(() => bookRef.current?.pageFlip().flipNext(), []);
  const goPrev = useCallback(() => bookRef.current?.pageFlip().flipPrev(), []);

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
        <button
          className="read-back-btn"
          onClick={() =>
            navigate(`/book/${id}`, { replace: true, state: { from } })
          }
        >
          ← 책 정보로
        </button>
      </div>
    );
  }

  return (
    <div className="read-container">
      <div className="read-header">
        <button
          className="read-back-btn"
          onClick={() =>
            navigate(`/book/${id}`, { replace: true, state: { from } })
          }
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
        <HTMLFlipBook
          ref={bookRef}
          width={dim.width}
          height={dim.height}
          size="fixed"
          usePortrait={dim.isMobile}
          flippingTime={700}
          drawShadow={true}
          showCover={false}
          mobileScrollSupport={false}
          onFlip={onFlip}
          startPage={startPage}
          maxShadowOpacity={0.35}
          className="html-flipbook"
        >
          {pages.map((paragraphs, i) => (
            <BookPage
              key={i}
              paragraphs={paragraphs}
              pageNum={i + 1}
              totalPages={pages.length}
            />
          ))}
        </HTMLFlipBook>

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
