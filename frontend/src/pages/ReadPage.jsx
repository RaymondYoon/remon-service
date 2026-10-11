import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { getBookById, startReading, savePage, markAsDone } from "../api/bookApi";
import { isLoggedIn, getUser } from "../utils/auth";
import usePagination from "../hooks/usePagination";
import "./ReadPage.css";

const SAVE_DEBOUNCE_MS = 1500;

const LS_KEY = (email, bookId) =>
  email ? `remon_page_${email}_${bookId}` : `remon_page_${bookId}`;

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

// 책 페이지와 동일한 flex 레이아웃 — 렌더 후 본문 칸 높이 측정용
function PageMeasureFrame({ dim, contentMeasureRef }) {
  return (
    <div
      className="read-page-measure"
      style={{ width: dim.width, height: dim.height }}
      aria-hidden="true"
    >
      <div className="flip-page">
        <div className="flip-page-inner">
          <div className="flip-page-content" ref={contentMeasureRef} />
          <span className="flip-page-num">1 / 999</span>
        </div>
      </div>
    </div>
  );
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

  const bookRef = useRef(null);
  const saveTimer = useRef(null);
  const loggedIn = isLoggedIn();
  const userEmail = getUser()?.email ?? null;

  const {
    pages,
    pagesReady,
    currentPage,
    goToPage,
    dim,
    contentMeasureRef,
    totalPagesRef,
    resetPagination,
  } = usePagination({
    content: book?.content,
    ready: !loading,
    storageKey: LS_KEY(userEmail, id),
    initialPage,
  });

  useEffect(() => {
    resetPagination();

    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBookById(id);
        setBook(response.data);
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
      goToPage(page);
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
    [id, loggedIn, userEmail, goToPage, totalPagesRef]
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

  const measureFrame = (
    <PageMeasureFrame dim={dim} contentMeasureRef={contentMeasureRef} />
  );

  if (!pagesReady) {
    return (
      <>
        {measureFrame}
        <div className="read-state">
          <div className="read-spinner" />
          <p>페이지 준비 중...</p>
        </div>
      </>
    );
  }

  if (pages.length === 0) {
    return (
      <>
        {measureFrame}
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
      </>
    );
  }

  const isLastPage = currentPage >= pages.length - 1;

  return (
    <div className="read-container">
      {measureFrame}
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

      <div
        className="read-book"
        style={!dim.isMobile ? { maxWidth: dim.width * 2 } : undefined}
      >
        <HTMLFlipBook
          key={`${dim.width}x${dim.height}-${pages.length}-${dim.isMobile}`}
          ref={bookRef}
          width={dim.width}
          height={dim.height}
          size="fixed"
          usePortrait={dim.isMobile}
          flippingTime={600}
          drawShadow={!dim.isMobile}
          showCover={false}
          showPageCorners={false}
          mobileScrollSupport={false}
          useMouseEvents={true}
          swipeDistance={30}
          onFlip={onFlip}
          startPage={currentPage}
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
            이전
          </button>
          <span className="read-page-num">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            className="read-nav-btn"
            onClick={goNext}
            disabled={isLastPage}
          >
            다음
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadPage;
