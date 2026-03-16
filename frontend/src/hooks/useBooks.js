import { useState, useEffect } from "react";
import { getBooks } from "../api/bookApi";

const useBooks = (params = {}) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchBooks = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBooks(params);
        if (!cancelled) {
          // 배열 응답과 Spring Page({ content: [] }) 응답 모두 대응
          const data = response.data;
          setBooks(Array.isArray(data) ? data : (data.content ?? []));
        }
      } catch {
        if (!cancelled) {
          setError("책 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBooks();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { books, loading, error };
};

export default useBooks;
