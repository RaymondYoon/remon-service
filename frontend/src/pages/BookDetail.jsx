import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { getBookById, addToLibrary } from "../api/bookApi";
import { getReviews, createReview, deleteReview } from "../api/reviewApi";
import { isLoggedIn, getUser } from "../utils/auth";
import { useToast } from "../hooks/useToast";
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

  const [reviews, setReviews] = useState([]);
  const [myRating, setMyRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const loggedIn = isLoggedIn();
  const me = getUser();
  const showToast = useToast();

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

  useEffect(() => {
    getReviews(id)
      .then((res) => setReviews(res.data))
      .catch(() => {});
  }, [id]);

  const alreadyReviewed = me && reviews.some((r) => r.userId === me.id);

  const handleSubmitReview = async () => {
    if (myRating === 0) { setReviewError("별점을 선택해주세요."); return; }
    setReviewSubmitting(true);
    setReviewError("");
    try {
      const res = await createReview(id, { rating: myRating, content: reviewContent });
      setReviews((prev) => [res.data, ...prev]);
      setMyRating(0);
      setReviewContent("");
    } catch (err) {
      setReviewError(err.response?.data?.message || "리뷰 작성에 실패했습니다.");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("리뷰를 삭제하시겠습니까?")) return;
    try {
      await deleteReview(id, reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      showToast("리뷰가 삭제되었습니다.", "success");
    } catch {
      showToast("리뷰 삭제에 실패했습니다.", "error");
    }
  };

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
      showToast("내 서재에 추가되었습니다!", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "서재 추가에 실패했습니다.";
      setAddMessage(msg);
      setAddSuccess(false);
      showToast(msg, "error");
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

      {/* AI 생성 직후 진입 시 축하 배너 — DONE 상태일 때만 표시 */}
      {fromGenerate && book.status === "DONE" && (
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

      {/* 별점·리뷰 섹션 */}
      <div className="review-section">
        <h2 className="review-section-title">
          리뷰
          {book.averageRating != null && (
            <span className="review-avg">
              ⭐ {book.averageRating.toFixed(1)}
              <span className="review-count">({reviews.length})</span>
            </span>
          )}
        </h2>

        {/* 리뷰 작성 폼 */}
        {loggedIn && !alreadyReviewed && (
          <div className="review-form">
            <div className="review-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  className={`review-star-btn ${star <= (hoverRating || myRating) ? "active" : ""}`}
                  onClick={() => setMyRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  aria-label={`${star}점`}
                >
                  ★
                </button>
              ))}
              {myRating > 0 && <span className="review-star-label">{myRating}점</span>}
            </div>
            <textarea
              className="review-textarea"
              placeholder="이 책에 대한 감상을 남겨보세요 (선택)"
              value={reviewContent}
              onChange={(e) => setReviewContent(e.target.value)}
              rows={3}
            />
            {reviewError && <p className="review-error">{reviewError}</p>}
            <button
              className="review-submit-btn"
              onClick={handleSubmitReview}
              disabled={reviewSubmitting}
            >
              {reviewSubmitting ? "작성 중..." : "리뷰 작성"}
            </button>
          </div>
        )}

        {/* 리뷰 목록 */}
        {reviews.length === 0 ? (
          <p className="review-empty">아직 리뷰가 없습니다. 첫 리뷰를 남겨보세요!</p>
        ) : (
          <ul className="review-list">
            {reviews.map((review) => (
              <li key={review.id} className="review-item">
                <div className="review-item-header">
                  <span className="review-item-nickname">{review.nickname}</span>
                  <span className="review-item-stars">{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</span>
                  <span className="review-item-date">{review.createdAt}</span>
                  {me && review.userId === me.id && (
                    <button
                      className="review-delete-btn"
                      onClick={() => handleDeleteReview(review.id)}
                    >
                      삭제
                    </button>
                  )}
                </div>
                {review.content && <p className="review-item-content">{review.content}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>

    </div>
  );
};

export default BookDetail;
