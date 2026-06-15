import React from "react";
import { useNavigate } from "react-router-dom";
import { useBookGeneration } from "../context/BookGenerationContext";
import "./GenerationToast.css";

const GenerationToast = () => {
  const { bookId, status, progress, message, dismiss } = useBookGeneration();
  const navigate = useNavigate();

  if (!status) return null;

  const pct = Math.round(progress);

  const handleGoToBook = () => {
    navigate(`/book/${bookId}`);
    dismiss();
  };

  return (
    <div className="gen-toast">
      <div className="gen-toast-header">
        <span className="gen-toast-msg">{message}</span>
        <button className="gen-toast-close" onClick={dismiss} aria-label="닫기">✕</button>
      </div>

      {status === "generating" && (
        <>
          <div className="gen-toast-bar-wrap">
            <div className="gen-toast-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="gen-toast-pct">{pct}%</span>
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
