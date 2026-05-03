import { useState, useEffect, useCallback, useRef } from "react";
import { getBooks } from "../api/bookApi";

const PAGE_SIZE = 12;

const useInfiniteBooks = (params = {}) => {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  const paramsRef = useRef(params);
  // ref로 관리 — IntersectionObserver stale closure 방지
  const hasMoreRef = useRef(true);
  const loadingRef = useRef(false);

  const paramsKey = JSON.stringify(params);

  // params(검색어/장르)가 바뀌면 목록 리셋
  useEffect(() => {
    paramsRef.current = params;
    hasMoreRef.current = true;
    setBooks([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // 페이지 fetch — hasMore는 ref로 읽으므로 deps에서 제외
  useEffect(() => {
    let cancelled = false;
    const fetchPage = async () => {
      if (!hasMoreRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      try {
        const res = await getBooks({ ...paramsRef.current, page, size: PAGE_SIZE });
        if (cancelled) return;
        const data = res.data;
        const items = Array.isArray(data) ? data : (data.content ?? []);
        const last = Array.isArray(data) ? items.length < PAGE_SIZE : (data.last ?? true);
        setBooks((prev) => page === 0 ? items : [...prev, ...items]);
        hasMoreRef.current = !last;
        setHasMore(!last);
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
  }, [page, paramsKey, retryCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ref 사용으로 stable identity 보장 — Observer 재설정 불필요
  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) setPage((p) => p + 1);
  }, []);

  const retry = useCallback(() => {
    setError(null);
    setBooks([]);
    hasMoreRef.current = true;
    setHasMore(true);
    setPage(0);
    setRetryCount((c) => c + 1);
  }, []);

  return { books, loading, error, hasMore, loadMore, retry };
};

export default useInfiniteBooks;
