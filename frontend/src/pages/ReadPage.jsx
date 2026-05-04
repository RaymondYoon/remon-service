import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import HTMLFlipBook from "react-pageflip";
import { getBookById, startReading, savePage, markAsDone } from "../api/bookApi";
import { isLoggedIn, getUser } from "../utils/auth";
import "./ReadPage.css";

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

// DOM 렌더링 높이 기준으로 페이지 분할
// padding/font CSS와 동일한 값으로 숨김 컨테이너를 측정해 paragraph 단위 분할
function buildPagesByHeight(content, pageWidth, pageHeight) {
  if (!content) return [];

  const cleaned = cleanContent(content);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  // CSS clamp/fixed 값과 동일하게 계산
  const vw = window.innerWidth;
  const isMobile = vw <= 640;
  const topPad  = isMobile ? 32 : Math.min(52, Math.max(28, vw * 0.045));
  const sidePad = isMobile ? 24 : Math.min(44, Math.max(24, vw * 0.038));
  const fontSize = isMobile ? 15 : Math.min(16, Math.max(14, vw * 0.016));
  const contentW = Math.max(1, pageWidth - sidePad * 2);
  const contentH = Math.max(80, pageHeight - topPad - 48); // 48 = page num 영역

  // 측정용 숨김 div 생성 — 실제 페이지와 동일한 font/width
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;" +
    `width:${contentW}px;overflow:hidden;` +
    `font-size:${fontSize}px;line-height:2;word-break:keep-all;font-family:inherit;`;
  document.body.appendChild(probe);

  const pages = [];
  let current = [];

  for (const para of paragraphs) {
    const pEl = document.createElement("p");
    pEl.style.cssText = "margin:0 0 1.2em;text-indent:1em;padding:0;";
    pEl.textContent = para;
    probe.appendChild(pEl);

    if (probe.offsetHeight > contentH && current.length > 0) {
      // 이 paragraph를 추가하면 넘침 → 이전까지 페이지 확정
      pages.push([...current]);
      current = [para];
      probe.innerHTML = "";
      const resetP = document.createElement("p");
      resetP.style.cssText = "margin:0 0 1.2em;text-indent:1em;padding:0;";
      resetP.textContent = para;
      probe.appendChild(resetP);
    } else {
      current.push(para);
    }
  }

  if (current.length > 0) pages.push(current);
  document.body.removeChild(probe);
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

// App header(60) + container padding(32) + read-header(~40) + header-mb(12)
// + progress(4) + progress-mb(12) + gap(16) + nav(~44) + 안전 여유(20)
const VERTICAL_CHROME = 240;

function getPageDimensions() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxH = Math.max(300, vh - VERTICAL_CHROME);
  if (vw <= 640) {
    const w = Math.min(vw - 32, 360);
    return { width: w, height: Math.min(Math.round(w * 1.52), maxH), isMobile: true };
  }
  const pageWidth = Math.max(260, Math.min(400, Math.floor((vw - 48) / 2)));
  return { width: pageWidth, height: Math.min(Math.round(pageWidth * 1.51), maxH), isMobile: false };
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
  const [dim, setDim] = useState(getPageDimensions);

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
        const built = buildPagesByHeight(data.content, dim.width, dim.height);
        setPages(built);
        totalPagesRef.current = built.length;

        const lsPage = parseInt(localStorage.getItem(LS_KEY(userEmail, id)) ?? "", 10);
        const sp =
          initialPage != null
            ? Math.min(initialPage, Math.max(built.length - 1, 0))
            : !isNaN(lsPage)
            ? Math.min(lsPage, Math.max(built.length - 1, 0))
            : 0;
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

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => setDim(getPageDimensions()), 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  // dim 변경(resize) 시 페이지 재계산 — 현재 읽던 위치 유지
  useEffect(() => {
    if (!book) return;
    const built = buildPagesByHeight(book.content, dim.width, dim.height);
    setPages(built);
    totalPagesRef.current = built.length;
    setCurrentPage((prev) => Math.min(prev, Math.max(0, built.length - 1)));
  }, [dim]); // eslint-disable-line react-hooks/exhaustive-deps

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
          key={`${dim.width}x${dim.height}`}
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
