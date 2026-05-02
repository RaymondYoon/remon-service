import { useState, useEffect, useCallback, useRef } from "react";
import { getBooks } from "../api/bookApi";

const PAGE_SIZE = 12;

const useInfiniteBooks = (params = {}) => {
  const [books, setBooks] = useState([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const paramsRef = useRef(params);

  // params(검색어/장르)가 바뀌면 목록 리셋
  const paramsKey = JSON.stringify(params);
  useEffect(() => {
    paramsRef.current = params;
    setBooks([]);
    setPage(0);
    setHasMore(true);
    setError(null);
  }, [paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let cancelled = false;
    const fetchPage = async () => {
      if (!hasMore) return;
      setLoading(true);
      try {
        const res = await getBooks({ ...paramsRef.current, page, size: PAGE_SIZE });
        if (cancelled) return;
        const data = res.data;
        const items = Array.isArray(data) ? data : (data.content ?? []);
        const last = Array.isArray(data) ? items.length < PAGE_SIZE : (data.last ?? true);
        setBooks((prev) => page === 0 ? items : [...prev, ...items]);
        setHasMore(!last);
      } catch {
        if (!cancelled) setError("책 목록을 불러오지 못했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchPage();
    return () => { cancelled = true; };
  }, [page, hasMore, paramsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!loading && hasMore) setPage((p) => p + 1);
  }, [loading, hasMore]);

  return { books, loading, error, hasMore, loadMore };
};

export default useInfiniteBooks;
