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

// CSS .flip-page-num의 실제 높이: font-size 13px × line-height 1.5 ≈ 20px + padding-top 6px + padding-bottom 10px
// 하드코딩 48 대신 이 변수를 단일 진실 소스로 사용
const PAGE_NUM_HEIGHT = 36;

// probe(빈 상태)에 text를 binary search로 분할해 maxH에 맞는 최대 앞부분을 반환
// 단락이 한 페이지를 초과할 때 호출 — paragraph 잘림 문제의 핵심 해결책
function binarySearchSplit(probe, text, maxH, makeP) {
  let lo = 0, hi = text.length, best = 0;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    probe.innerHTML = "";
    probe.appendChild(makeP(text.slice(0, mid)));
    if (probe.offsetHeight <= maxH) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  // 한글/영문 모두 공백 기준으로 단어 경계에서 자름 — 음절 중간 절단 방지
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

// DOM 렌더링 높이 기준으로 페이지 분할
// 단락이 contentH를 초과하면 binary search로 분할 — 텍스트 잘림 문제 해결
function buildPagesByHeight(content, pageWidth, pageHeight) {
  if (!content) return [];

  const cleaned = cleanContent(content);
  const paragraphs = cleaned
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (paragraphs.length === 0) return [];

  const vw = window.innerWidth;
  const isMobile = vw <= 640;
  const topPad  = isMobile ? 32 : Math.min(52, Math.max(28, vw * 0.045));
  const botPad  = 8;  // CSS .flip-page-inner bottom padding과 동일
  const sidePad = isMobile ? 24 : Math.min(44, Math.max(24, vw * 0.038));
  const fontSize = isMobile ? 15 : Math.min(16, Math.max(14, vw * 0.016));
  const contentW = Math.max(1, pageWidth - sidePad * 2);
  // PAGE_NUM_HEIGHT를 명시적으로 빼 하드코딩 제거 — CSS 변경 시 이 변수만 수정하면 됨
  const contentH = Math.max(80, pageHeight - topPad - botPad - PAGE_NUM_HEIGHT);

  // probe: flip-page-content와 동일한 width/font/box-sizing 환경
  // padding·box-sizing 포함해 실제 렌더 폭과 정확히 일치시킴
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;top:-9999px;left:-9999px;" +
    `width:${contentW}px;box-sizing:border-box;padding:0;margin:0;` +
    `font-size:${fontSize}px;line-height:2;word-break:keep-all;font-family:inherit;` +
    "overflow:hidden;";
  document.body.appendChild(probe);

  const makeP = (text) => {
    const el = document.createElement("p");
    el.style.cssText = "margin:0 0 1.2em;text-indent:1em;padding:0;";
    el.textContent = text;
    return el;
  };

  const pages = [];
  let current = [];

  // queue 방식으로 처리 — binary search 분할 결과를 queue 앞에 재삽입 가능
  const queue = [...paragraphs];

  while (queue.length > 0) {
    const para = queue.shift();
    probe.appendChild(makeP(para));

    if (probe.offsetHeight <= contentH) {
      // 아직 넘치지 않음 → 현재 페이지에 추가
      current.push(para);
    } else {
      // 넘침 — 마지막으로 추가한 단락 제거 후 분기 처리
      probe.removeChild(probe.lastChild);

      if (current.length === 0) {
        // 현재 페이지가 비어있는데 이 단락 하나만으로도 넘침
        // → binary search로 앞부분을 현재 페이지에, 나머지를 queue 앞에 삽입
        const split = binarySearchSplit(probe, para, contentH, makeP);
        if (split.front.length > 0) {
          pages.push([split.front]);
          probe.innerHTML = "";
          current = [];
          if (split.back.length > 0) queue.unshift(split.back);
        } else {
          // 한 글자도 안 들어가는 극단적 케이스 — 통째로 넣고 다음 페이지로
          pages.push([para]);
          probe.innerHTML = "";
          current = [];
        }
      } else {
        // 현재 페이지에 내용 있음 → 이 단락 추가 전에 페이지 확정
        // 이 단락은 queue 앞에 재삽입해 다음 루프에서 새 페이지 시작점으로 처리
        pages.push([...current]);
        probe.innerHTML = "";
        current = [];
        queue.unshift(para);
      }
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

const MIN_PAGE_HEIGHT = 500;

function getPageDimensions() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const maxH = Math.max(300, vh - VERTICAL_CHROME);
  if (vw <= 640) {
    const w = Math.min(vw - 32, 360);
    return { width: w, height: Math.max(Math.min(Math.round(w * 1.52), maxH), MIN_PAGE_HEIGHT), isMobile: true };
  }
  const pageWidth = Math.max(260, Math.min(400, Math.floor((vw - 48) / 2)));
  return { width: pageWidth, height: Math.max(Math.min(Math.round(pageWidth * 1.51), maxH), MIN_PAGE_HEIGHT), isMobile: false };
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
  const [dim, setDim] = useState(() => getPageDimensions());

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

  // dim 변경(resize) 시 페이지 재계산 — 현재 읽던 위치를 새 페이지 수 범위 내로 보정
  useEffect(() => {
    if (!book) return;
    const built = buildPagesByHeight(book.content, dim.width, dim.height);
    setPages(built);
    totalPagesRef.current = built.length;
    // resize 후 페이지 수가 줄어도 마지막 페이지를 넘지 않도록 보정
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

  const isLastPage = currentPage >= pages.length - 1;

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
          usePortrait={false}
          flippingTime={700}
          drawShadow={true}
          showCover={false}
          showPageCorners={false}
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
