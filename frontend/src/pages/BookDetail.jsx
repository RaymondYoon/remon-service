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

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [addMessage, setAddMessage] = useState("");

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
      await addToLibrary(id);
      setAddMessage("내 서재에 추가되었습니다! 📚");
    } catch (err) {
      const msg = err.response?.data?.message || "서재 추가에 실패했습니다.";
      setAddMessage(msg);
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
      <button className="detail-back-btn" onClick={() => navigate(-1)}>← 뒤로</button>

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
            <button
              className="add-library-btn"
              onClick={handleAddToLibrary}
              disabled={addLoading}
            >
              {addLoading ? "추가 중..." : "내 서재에 담기"}
            </button>
          </div>

          {addMessage && (
            <p className="detail-add-msg">{addMessage}</p>
          )}
        </div>
      </div>

      {/* 본문 읽기 영역 — content 있을 때만 표시 */}
      {book.content && (
        <div className="detail-content-section">
          <h2 className="detail-content-title">본문</h2>
          <div className="detail-content-body">
            {book.content.split("\n").map((line, i) => (
              line.trim()
                ? <p key={i}>{line}</p>
                : <br key={i} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BookDetail;
