import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getMyLibrary, updateBookStatus, deleteFromLibrary } from "../api/bookApi";
import { getUser } from "../utils/auth";
import "./MyLibrary.css";

const TABS = [
  { key: "ALL",     label: "전체" },
  { key: "SAVED",   label: "담은 책" },
  { key: "READING", label: "읽는 중" },
  { key: "DONE",    label: "완독" },
];

const STATUS_OPTIONS = [
  { value: "SAVED",   label: "담은 책" },
  { value: "READING", label: "읽는 중" },
  { value: "DONE",    label: "완독" },
];

const MyLibrary = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = getUser();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("ALL");
  const [statusUpdating, setStatusUpdating] = useState(new Set());

  useEffect(() => {
    const fetchLibrary = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getMyLibrary();
        const data = response.data;
        const raw = Array.isArray(data) ? data : (data.content ?? []);
        setBooks(raw.map((item) => ({
          id: item.bookId,
          libraryId: item.id,
          title: item.title,
          author: item.author,
          coverImage: item.coverImageUrl,
          genre: item.genre,
          status: item.status,
        })));
      } catch {
        setError("서재를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  const handleStatusChange = async (bookId, newStatus) => {
    setStatusUpdating((prev) => new Set(prev).add(bookId));
    try {
      await updateBookStatus(bookId, newStatus);
      setBooks((prev) =>
        prev.map((b) => b.id === bookId ? { ...b, status: newStatus } : b)
      );
    } catch {
      // 상태 변경 실패 시 조용히 원상 유지
    } finally {
      setStatusUpdating((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  };

  const handleDelete = async (bookId) => {
    if (!window.confirm("서재에서 삭제할까요?")) return;
    try {
      await deleteFromLibrary(bookId);
      setBooks((prev) => prev.filter((b) => b.id !== bookId));
    } catch {
      // silent fail
    }
  };

  const filteredBooks = activeTab === "ALL"
    ? books
    : books.filter((b) => b.status === activeTab);

  return (
    <div className="library-container">
      <div className="library-header">
        <h2 className="library-title">
          {user?.nickname ? `${user.nickname}님의 서재` : "내 서재"}
        </h2>
        <p className="library-sub">담아둔 책들을 모아 볼 수 있어요</p>
      </div>

      <div className="library-stats">
        <div className="stat-card">
          <span className="stat-num">{books.length}</span>
          <span className="stat-label">전체</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{books.filter(b => b.status === "READING").length}</span>
          <span className="stat-label">읽는 중</span>
        </div>
        <div className="stat-card">
          <span className="stat-num">{books.filter(b => b.status === "DONE").length}</span>
          <span className="stat-label">완독</span>
        </div>
      </div>

      <div className="library-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`library-tab${activeTab === tab.key ? " library-tab--active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
            {tab.key !== "ALL" && (
              <span className="library-tab-count">
                {books.filter(b => b.status === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <section className="library-section">
        {loading && (
          <div className="library-state">
            <div className="library-spinner" />
            <p>불러오는 중...</p>
          </div>
        )}

        {!loading && error && (
          <div className="library-state library-error">
            <p>😥 {error}</p>
          </div>
        )}

        {!loading && !error && filteredBooks.length === 0 && (
          <div className="library-state">
            <p className="library-empty-msg">
              {activeTab === "ALL"
                ? "아직 담은 책이 없어요."
                : `${TABS.find(t => t.key === activeTab)?.label} 책이 없어요.`}
            </p>
            {activeTab === "ALL" && (
              <div className="library-empty-action">
                <button className="library-browse-btn" onClick={() => navigate("/")}>
                  책 둘러보기
                </button>
              </div>
            )}
          </div>
        )}

        {!loading && !error && filteredBooks.length > 0 && (
          <div className="lib-grid">
            {filteredBooks.map((book) => (
              <div key={book.id} className="lib-card">
                <div
                  className="lib-cover"
                  style={book.coverImage ? { backgroundImage: `url(${book.coverImage})` } : {}}
                >
                  {!book.coverImage && <span className="lib-cover-placeholder">📖</span>}
                  <button
                    className="lib-delete-btn"
                    onClick={() => handleDelete(book.id)}
                    title="서재에서 삭제"
                  >
                    ✕
                  </button>
                </div>

                <div className="lib-info">
                  <h3 className="lib-title">{book.title}</h3>
                  <p className="lib-author">{book.author}</p>
                </div>

                <div className="lib-status-row">
                  <select
                    className="status-select"
                    value={book.status}
                    disabled={statusUpdating.has(book.id)}
                    onChange={(e) => handleStatusChange(book.id, e.target.value)}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <Link
                  to={`/book/${book.id}`}
                  state={{ from: location.pathname }}
                  className="lib-detail-btn"
                >
                  자세히 보기
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default MyLibrary;
