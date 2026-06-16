import React from "react";
import { useNavigate } from "react-router-dom";
import { useBookGeneration } from "../context/BookGenerationContext";
import "./GenerationToast.css";

const GenerationToast = () => {
  const { bookId, status, progress, message, minimized, minimize, restore, dismiss } = useBookGeneration();
  const navigate = useNavigate();

  if (!status) return null;

  const pct = Math.round(progress);

  const handleGoToBook = () => {
    navigate(`/book/${bookId}`);
    dismiss();
  };

  const handleClose = () => {
    if (status === "generating") {
      minimize();
    } else {
      dismiss();
    }
  };

  if (minimized) {
    return (
      <button className="gen-toast-bubble" onClick={restore} aria-label="생성 진행 상황 보기" title="클릭하여 진행 상황 보기">
        🍋 {pct}%
      </button>
    );
  }

  return (
    <div className="gen-toast">
      <div className="gen-toast-header">
        <span className="gen-toast-msg">{message}</span>
        <button className="gen-toast-close" onClick={handleClose} aria-label="닫기">✕</button>
      </div>

      {status === "generating" && (
        <>
          <div className="gen-toast-bar-wrap">
            <div className="gen-toast-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="gen-toast-pct">{pct}% · 최소화하려면 ✕ 클릭</span>
        </>
      )}

      {status === "done" && (
        <button className="gen-toast-cta" onClick={handleGoToBook}>
          읽으러 가기 →
        </button>
      )}
    </div>
  );
};

export default GenerationToast;
