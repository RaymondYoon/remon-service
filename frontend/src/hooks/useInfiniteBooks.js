import { useState, useEffect, useCallback, useRef } from "react";
import { getBooksCursor } from "../api/bookApi";

const PAGE_SIZE = 12;

const useInfiniteBooks = (params = {}) => {
  const [books, setBooks] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadTrigger, setLoadTrigger] = useState(0);

  const paramsRef = useRef(params);
  // ref로 관리 — IntersectionObserver stale closure 방지
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);
  const cursorRef = useRef(null);
  const isResetRef = useRef(true);

  const paramsKey = JSON.stringify(params);

  // params(검색어/장르)가 바뀌면 목록 리셋
  useEffect(() => {
    paramsRef.current = params;
    hasMoreRef.current = true;
    cursorRef.current = null;
    isResetRef.current = true;
    setBooks([]);
    setHasMore(true);
    setError(null);
    setLoadTrigger((t) => t + 1);
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // cursor fetch
  useEffect(() => {
    let cancelled = false;
    const fetchPage = async () => {
      if (!hasMoreRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const res = await getBooksCursor({
          ...paramsRef.current,
          cursor: cursorRef.current ?? undefined,
          size: PAGE_SIZE,
        });
        if (cancelled) return;
        const data = res.data;
        const items = data.books ?? [];
        const nextCursor = data.nextCursor ?? null;
        const more = data.hasMore ?? false;
        setBooks((prev) => isResetRef.current ? items : [...prev, ...items]);
        isResetRef.current = false;
        cursorRef.current = nextCursor;
        hasMoreRef.current = more;
        setHasMore(more);
      } catch {
        if (!cancelled) {
          setError("서버와 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
          hasMoreRef.current = false;
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    };
    fetchPage();
    return () => { cancelled = true; };
  }, [loadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // ref 사용으로 stable identity 보장 — Observer 재설정 불필요
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) setLoadTrigger((t) => t + 1);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setBooks([]);
    hasMoreRef.current = true;
    cursorRef.current = null;
    isResetRef.current = true;
    setHasMore(true);
    setLoadTrigger((t) => t + 1);
  }, []);

  return { books, loading, error, hasMore, loadMore, retry };
};

export default useInfiniteBooks;
