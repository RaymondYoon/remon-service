import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
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

function binarySearchSplit(probe, text, maxH, makeP) {
  let lo = 0, hi = text.length, best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probe.innerHTML = "";
    probe.appendChild(makeP(text.slice(0, mid)));
    if (probe.offsetHeight <= maxH) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  let cut = best;
  if (cut > 0 && cut < text.length) {
    const sp = text.lastIndexOf(" ", cut);
    if (sp > 0) cut = sp;
  }
  return {
    front: text.slice(0, cut).trimEnd(),
    back: text.slice(cut).trimStart(),
  };
}

// 문단을 문장 단위로 분리 (마침표·느낌표·물음표·… 뒤 공백 기준)
function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+/).filter((s) => s.trim().length > 0);
}

// 실제 .flip-page-content 높이(contentEl.clientHeight) 기준으로 페이지 분할
function buildPagesByContentBox(content, contentEl) {
  if (!content || !contentEl) return [];

  const maxH = contentEl.clientHeight;
  if (maxH < 20) return [];

  const cleaned = cleanContent(content);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  const probe = document.createElement("div");
  probe.className = "read-page-probe";
  probe.style.width = "100%";
  contentEl.appendChild(probe);

  const makeP = (text) => {
    const el = document.createElement("p");
    el.className = "read-para";
    el.textContent = text;
    return el;
  };

  // probe를 items 배열 내용으로 재구성
  const rebuildProbe = (items) => {
    probe.innerHTML = "";
    items.forEach((item) => probe.appendChild(makeP(item)));
  };

  const pages = [];
  let current = [];
  const queue = [...paragraphs];

  while (queue.length > 0) {
    const para = queue.shift();
    probe.appendChild(makeP(para));

    if (probe.offsetHeight <= maxH) {
      current.push(para);
    } else {
      probe.removeChild(probe.lastChild);

      if (current.length === 0) {
        // 빈 페이지에서도 안 들어감 — 문자 단위 이진 탐색으로 분할
        const split = binarySearchSplit(probe, para, maxH, makeP);
        if (split.front.length > 0) {
          pages.push([split.front]);
          probe.innerHTML = "";
          current = [];
          if (split.back.length > 0) queue.unshift(split.back);
        } else {
          pages.push([para]);
          probe.innerHTML = "";
          current = [];
        }
      } else {
        // 현재 페이지에 내용이 있음 — 문장 단위로 쪼개서 빈 공간 채우기
        const sentences = splitSentences(para);
        let fittedCount = 0;

        if (sentences.length > 1) {
          for (let i = 1; i <= sentences.length; i++) {
            const partial = sentences.slice(0, i).join(" ");
            rebuildProbe([...current, partial]);
            if (probe.offsetHeight <= maxH) {
              fittedCount = i;
            } else {
              break;
            }
          }
        }

        if (fittedCount > 0 && fittedCount < sentences.length) {
          // 일부 문장만 현재 페이지에 들어감 — 현재 페이지 채우고 나머지는 다음 페이지로
          const frontText = sentences.slice(0, fittedCount).join(" ");
          const backText = sentences.slice(fittedCount).join(" ");
          current.push(frontText);
          pages.push([...current]);
          probe.innerHTML = "";
          current = [];
          if (backText.trim()) queue.unshift(backText);
        } else if (fittedCount === sentences.length) {
          // 문장 재결합 시 전체 들어감 (원본과 미세한 차이)
          current.push(sentences.join(" "));
          rebuildProbe(current);
        } else {
          // 한 문장도 안 들어감 — 현재 페이지 확정, 다음 페이지에서 재시도
          pages.push([...current]);
          probe.innerHTML = "";
          current = [];
          queue.unshift(para);
        }
      }
    }
  }

  if (current.length > 0) pages.push(current);
  contentEl.removeChild(probe);
  return pages;
}

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

const VERTICAL_CHROME = 215; // 모바일 40px 안전마진은 데스크톱에 적용하지 않음
const MIN_PAGE_HEIGHT = 500;

function getPageDimensions() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clientW = document.documentElement.clientWidth;
  if (vw <= 640) {
    const w = clientW - 16;
    const h = vh - 200; // 모바일 전용 40px 안전마진
    return { width: w, height: h, isMobile: true };
  }
  const maxH = Math.max(vh - VERTICAL_CHROME, MIN_PAGE_HEIGHT);
  const pageWidth = Math.max(260, Math.min(400, Math.floor((vw - 48) / 2)));
  return { width: pageWidth, height: maxH, isMobile: false };
}

function setRealVh() {
  document.documentElement.style.setProperty("--real-vh", `${window.innerHeight * 0.01}px`);
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
  const [pagesReady, setPagesReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dim, setDim] = useState(() => getPageDimensions());

  const bookRef = useRef(null);
  const saveTimer = useRef(null);
  const totalPagesRef = useRef(0);
  const contentMeasureRef = useRef(null);
  const initialPageSetRef = useRef(false);
  const loggedIn = isLoggedIn();
  const userEmail = getUser()?.email ?? null;

  useEffect(() => {
    initialPageSetRef.current = false;
    setPagesReady(false);
    setPages([]);
    setCurrentPage(0);

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

  // 렌더된 본문 칸 높이를 측정한 뒤 페이지 분할 (기종·뷰포트마다 자동 반영)
  useLayoutEffect(() => {
    if (loading || !book?.content) return;

    let cancelled = false;

    const paginate = () => {
      if (cancelled) return;

      const contentEl = contentMeasureRef.current;
      if (!contentEl) {
        requestAnimationFrame(paginate);
        return;
      }

      const maxH = contentEl.clientHeight;
      if (maxH < 40) {
        requestAnimationFrame(paginate);
        return;
      }

      const built = buildPagesByContentBox(book.content, contentEl);
      if (cancelled) return;

      setPages(built);
      totalPagesRef.current = built.length;
      setPagesReady(true);

      if (!initialPageSetRef.current) {
        initialPageSetRef.current = true;
        const lsPage = parseInt(localStorage.getItem(LS_KEY(userEmail, id)) ?? "", 10);
        const sp =
          initialPage != null
            ? Math.min(initialPage, Math.max(built.length - 1, 0))
            : !isNaN(lsPage)
            ? Math.min(lsPage, Math.max(built.length - 1, 0))
            : 0;
        setCurrentPage(sp);
      } else {
        setCurrentPage((prev) => Math.min(prev, Math.max(0, built.length - 1)));
      }
    };

    paginate();
    return () => {
      cancelled = true;
    };
  }, [book, dim, loading, id, initialPage, userEmail]);

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
    setRealVh();
    window.addEventListener("resize", setRealVh);
    window.addEventListener("orientationchange", setRealVh);
    return () => {
      window.removeEventListener("resize", setRealVh);
      window.removeEventListener("orientationchange", setRealVh);
    };
  }, []);

  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setPagesReady(false);
        setDim(getPageDimensions());
      }, 150);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

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

      <div className="read-book">
        <HTMLFlipBook
          key={`${dim.width}x${dim.height}-${pages.length}-${dim.isMobile}`}
          ref={bookRef}
          width={dim.width}
          height={dim.height}
          size="fixed"
          usePortrait={dim.isMobile}
          flippingTime={600}
          drawShadow={false}
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
            이전 페이지
          </button>
          <span className="read-page-num">
            {currentPage + 1} / {pages.length}
          </span>
          <button
            className="read-nav-btn"
            onClick={goNext}
            disabled={isLastPage}
          >
            다음 페이지
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadPage;
