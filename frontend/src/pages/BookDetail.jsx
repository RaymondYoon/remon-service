import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBookById, addToLibrary } from "../api/bookApi";
import { isLoggedIn } from "../utils/auth";
import "./BookDetail.css";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const fromGenerate = location.state?.fromGenerate ?? false;
  const from = location.state?.from ?? null;

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState("");
  const [addSuccess, setAddSuccess] = useState(false);

  useEffect(() => {
    const fetchBook = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await getBookById(id);
        setBook(response.data);
      } catch {
        setError("책 정보를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  const handleAddToLibrary = async () => {
    if (!isLoggedIn()) {
      navigate("/login");
      return;
    }
    setAddLoading(true);
    setAddMessage("");
    try {
      await addToLibrary(Number(id));
      setAddMessage("내 서재에 추가되었습니다! 📚");
      setAddSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.error || "서재 추가에 실패했습니다.";
      setAddMessage(msg);
      setAddSuccess(false);
    } finally {
      setAddLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="detail-state">
        <div className="detail-spinner" />
        <p>불러오는 중...</p>
      </div>
    );
  }

  if (error || !book) {
    return (
      <div className="detail-state detail-error">
        <p>😥 {error || "책을 찾을 수 없습니다."}</p>
        <button className="detail-back-btn" onClick={() => navigate(-1)}>돌아가기</button>
      </div>
    );
  }

  return (
    <div className="detail-container">
      <button
        className="detail-back-btn"
        onClick={() => from ? navigate(from) : navigate(-1)}
      >
        ← 뒤로
      </button>

      {/* AI 생성 직후 진입 시 축하 배너 */}
      {fromGenerate && (
        <div className="detail-generated-banner">
          ✨ 이야기가 완성됐어요! 지금 바로 읽어보세요.
        </div>
      )}

      <div className="detail-card">
        <div className="detail-cover">
          {book.coverImage ? (
            <img src={book.coverImage} alt={book.title} />
          ) : (
            <span className="detail-cover-placeholder">
              {book.isAiGenerated ? "✨" : "📖"}
            </span>
          )}
        </div>

        <div className="detail-info">
          {book.isAiGenerated && (
            <span className="detail-ai-badge">AI 생성</span>
          )}
          <h1 className="detail-title">{book.title}</h1>
          <p className="detail-author">{book.author}</p>

          {book.genre && (
            <p className="detail-meta">장르: {book.genre}</p>
          )}
          {book.publishedDate && (
            <p className="detail-meta">생성일: {book.publishedDate}</p>
          )}
          {book.isbn && (
            <p className="detail-meta">ISBN: {book.isbn}</p>
          )}

          {book.description && (
            <div className="detail-desc">
              <h3>책 소개</h3>
              <p>{book.description}</p>
            </div>
          )}

          <div className="detail-actions">
            {book.content && (
              <button
                className="read-book-btn"
                onClick={() => navigate(`/book/${id}/read`, { state: { from } })}
              >
                본문 보기
              </button>
            )}
            <button
              className="add-library-btn"
              onClick={handleAddToLibrary}
              disabled={addLoading || addSuccess}
            >
              {addLoading ? "추가 중..." : addSuccess ? "서재에 담겼어요 ✓" : "내 서재에 담기"}
            </button>
          </div>

          {addMessage && (
            <p className={addSuccess ? "detail-add-msg" : "detail-add-msg detail-add-msg--error"}>
              {addMessage}
            </p>
          )}
        </div>
      </div>

    </div>
  );
};

export default BookDetail;
