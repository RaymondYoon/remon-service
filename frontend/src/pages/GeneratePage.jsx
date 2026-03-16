import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateBook } from "../api/bookApi";
import "./GeneratePage.css";

const GENRES  = ["SF", "판타지", "로맨스", "일상", "공포"];
const LENGTHS = [
  { value: "SHORT",  label: "짧게 (~3,000자)" },
  { value: "MEDIUM", label: "보통 (~8,000자)" },
  { value: "LONG",   label: "길게 (~15,000자)" },
];
const TONES = [
  { value: "WARM",      label: "따뜻하게" },
  { value: "DARK",      label: "긴장감 있게" },
  { value: "HUMOROUS",  label: "유쾌하게" },
];

const GeneratePage = () => {
  const navigate = useNavigate();

  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords]         = useState([]);
  const [genre, setGenre]               = useState(GENRES[0]);
  const [length, setLength]             = useState("SHORT");
  const [tone, setTone]                 = useState("WARM");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  // 키워드 추가 (Enter 또는 쉼표 입력 시)
  const handleKeywordKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim().replace(/,$/, "");
    if (!trimmed) return;
    if (keywords.length >= 3) {
      setError("키워드는 최대 3개까지 입력할 수 있어요.");
      return;
    }
    if (keywords.includes(trimmed)) {
      setKeywordInput("");
      return;
    }
    setKeywords([...keywords, trimmed]);
    setKeywordInput("");
    setError("");
  };

  const removeKeyword = (kw) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const allKeywords = [...keywords];
    const trimmed = keywordInput.trim();
    if (trimmed && !allKeywords.includes(trimmed) && allKeywords.length < 3) {
      allKeywords.push(trimmed);
    }

    if (allKeywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.");
      return;
    }

    setLoading(true);
    try {
      const response = await generateBook({
        keywords: allKeywords,
        genre,
        length,
        tone,
      });
      const bookId = response.data.id;
      navigate(`/book/${bookId}`, { state: { fromGenerate: true } });
    } catch (err) {
      const msg = err.response?.data?.error || "책 생성에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="generate-loading">
        <div className="generate-loading-icon">✨</div>
        <h2 className="generate-loading-title">Remon이 이야기를 쓰고 있어요</h2>
        <p className="generate-loading-sub">
          키워드: {[...keywords, keywordInput.trim()].filter(Boolean).join(", ")}
        </p>
        <div className="generate-spinner" />
        <p className="generate-loading-hint">잠시만 기다려주세요. 보통 10~30초 정도 걸려요.</p>
      </div>
    );
  }

  return (
    <div className="generate-container">
      <div className="generate-header">
        <h1 className="generate-title">나만의 이야기 만들기</h1>
        <p className="generate-sub">키워드를 입력하면 Remon AI가 짧은 소설을 써드려요</p>
      </div>

      <form className="generate-form" onSubmit={handleSubmit}>

        {/* 키워드 */}
        <div className="generate-field">
          <label className="generate-label">
            키워드 <span className="generate-label-hint">최대 3개 · Enter로 추가</span>
          </label>
          <div className="keyword-input-wrap">
            {keywords.map((kw) => (
              <span key={kw} className="keyword-tag">
                {kw}
                <button type="button" className="keyword-tag-remove" onClick={() => removeKeyword(kw)}>×</button>
              </span>
            ))}
            {keywords.length < 3 && (
              <input
                type="text"
                className="keyword-input"
                placeholder={keywords.length === 0 ? "예: 우주, 고양이, 시간여행" : ""}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                onBlur={addKeyword}
              />
            )}
          </div>
        </div>

        {/* 장르 */}
        <div className="generate-field">
          <label className="generate-label">장르</label>
          <div className="chip-group">
            {GENRES.map((g) => (
              <button
                key={g}
                type="button"
                className={`chip ${genre === g ? "chip--active" : ""}`}
                onClick={() => setGenre(g)}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* 분량 */}
        <div className="generate-field">
          <label className="generate-label">분량</label>
          <div className="chip-group">
            {LENGTHS.map((l) => (
              <button
                key={l.value}
                type="button"
                className={`chip ${length === l.value ? "chip--active" : ""}`}
                onClick={() => setLength(l.value)}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        {/* 톤 */}
        <div className="generate-field">
          <label className="generate-label">분위기</label>
          <div className="chip-group">
            {TONES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`chip ${tone === t.value ? "chip--active" : ""}`}
                onClick={() => setTone(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="generate-error">{error}</p>}

        <button type="submit" className="generate-submit-btn">
          이야기 만들기 ✨
        </button>
      </form>
    </div>
  );
};

export default GeneratePage;
