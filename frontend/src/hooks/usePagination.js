import { useState, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { buildPagesByContentBox } from "../utils/paginateContent";

const VERTICAL_CHROME = 230; // 헤더+진행바+네비+패딩 합산 + 15px 여유 버퍼
const MIN_PAGE_HEIGHT = 500;

function getPageDimensions() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clientW = document.documentElement.clientWidth;
  if (vw <= 640) {
    const w = clientW - 16;
    const h = vh - 220; // 모바일 안전마진 (기존 200 → 220)
    return { width: w, height: h, isMobile: true };
  }
  const maxH = Math.max(vh - VERTICAL_CHROME, MIN_PAGE_HEIGHT);
  // 1400px 이상 대형 화면: 책 전체 너비를 화면의 58% (최대 950px)로 확장
  const pageWidth = vw >= 1400
    ? Math.floor(Math.min(vw * 0.58, 950) / 2)
    : Math.max(260, Math.min(400, Math.floor((vw - 48) / 2)));
  return { width: pageWidth, height: maxH, isMobile: false };
}

function setRealVh() {
  document.documentElement.style.setProperty("--real-vh", `${window.innerHeight * 0.01}px`);
}

/**
 * 책 뷰어 페이지 분할 + 현재 페이지 상태.
 *
 * - 화면 크기(dim)에 맞춘 측정용 본문 칸(contentMeasureRef)의 실제 높이로 본문을 페이지 분할
 * - 첫 분할 시 시작 페이지: initialPage → localStorage(storageKey) → 0
 * - 창 크기 변경 시 재분할하고, 읽던 위치는 진행률 기준으로 유지
 *
 * @param {object}  options
 * @param {string}  options.content     책 본문
 * @param {boolean} options.ready       본문 로딩이 끝났는지 (false 면 분할하지 않음)
 * @param {string}  options.storageKey  마지막 페이지가 저장된 localStorage 키
 * @param {number|null} options.initialPage  라우터 state 로 받은 시작 페이지
 */
export default function usePagination({ content, ready, storageKey, initialPage }) {
  const [pages, setPages] = useState([]);
  const [pagesReady, setPagesReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [dim, setDim] = useState(() => getPageDimensions());

  const totalPagesRef = useRef(0);
  const currentPageRef = useRef(0); // 리사이즈 시 비율 기반 페이지 복원용
  const contentMeasureRef = useRef(null);
  const initialPageSetRef = useRef(false);

  // 다른 책으로 이동할 때 호출 — 분할 결과와 시작 페이지 결정 상태를 초기화
  const resetPagination = useCallback(() => {
    initialPageSetRef.current = false;
    setPagesReady(false);
    setPages([]);
    setCurrentPage(0);
  }, []);

  // 페이지 넘김 시 현재 페이지 갱신
  const goToPage = useCallback((page) => {
    setCurrentPage(page);
    currentPageRef.current = page;
  }, []);

  // 렌더된 본문 칸 높이를 측정한 뒤 페이지 분할 (기종·뷰포트마다 자동 반영)
  useLayoutEffect(() => {
    if (!ready || !content) return;

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

      const built = buildPagesByContentBox(content, contentEl);
      if (cancelled) return;

      const prevTotal = totalPagesRef.current; // 비율 계산용 이전 총 페이지 수
      setPages(built);
      totalPagesRef.current = built.length;
      setPagesReady(true);

      if (!initialPageSetRef.current) {
        initialPageSetRef.current = true;
        const lsPage = parseInt(localStorage.getItem(storageKey) ?? "", 10);
        const sp =
          initialPage != null
            ? Math.min(initialPage, Math.max(built.length - 1, 0))
            : !isNaN(lsPage)
            ? Math.min(lsPage, Math.max(built.length - 1, 0))
            : 0;
        setCurrentPage(sp);
        currentPageRef.current = sp;
      } else {
        // 리사이즈 시 읽던 위치를 진행률 기준으로 유지
        const progress = prevTotal > 1 ? currentPageRef.current / (prevTotal - 1) : 0;
        const newPage = Math.round(progress * Math.max(0, built.length - 1));
        const clamped = Math.min(newPage, Math.max(0, built.length - 1));
        setCurrentPage(clamped);
        currentPageRef.current = clamped;
      }
    };

    paginate();
    return () => {
      cancelled = true;
    };
  }, [content, dim, ready, storageKey, initialPage]);

  // 모바일 주소창 높이 변화 대응 (--real-vh)
  useEffect(() => {
    setRealVh();
    window.addEventListener("resize", setRealVh);
    window.addEventListener("orientationchange", setRealVh);
    return () => {
      window.removeEventListener("resize", setRealVh);
      window.removeEventListener("orientationchange", setRealVh);
    };
  }, []);

  // 창 크기 변경 → 300ms 디바운스 후 재측정·재분할
  useEffect(() => {
    let timer;
    const handleResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setPagesReady(false);
        setDim(getPageDimensions());
      }, 300);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
    };
  }, []);

  return {
    pages,
    pagesReady,
    currentPage,
    goToPage,
    dim,
    contentMeasureRef,
    totalPagesRef,
    resetPagination,
  };
}
