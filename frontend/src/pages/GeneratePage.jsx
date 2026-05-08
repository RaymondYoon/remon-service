import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { generateBook, getBookGenerationStatus } from "../api/bookApi";
import { getLemonInfo } from "../api/userApi";
import LemonTree from "../components/LemonTree";
import LemonFall from "../components/LemonFall";
import "./GeneratePage.css";

const GENRES  = ["SF", "판타지", "로맨스", "일상", "공포"];
const TONES = [
  { value: "WARM",      label: "따뜻하게" },
  { value: "DARK",      label: "긴장감 있게" },
  { value: "HUMOROUS",  label: "유쾌하게" },
];
const ENDINGS = [
  { value: "HAPPY", label: "해피엔딩" },
  { value: "SAD",   label: "새드엔딩" },
  { value: "OPEN",  label: "열린결말" },
];

const GeneratePage = () => {
  const navigate = useNavigate();

  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords]         = useState([]);
  const [genre, setGenre]               = useState(GENRES[0]);
  const [tone, setTone]                 = useState("WARM");
  const [ending, setEnding]             = useState("HAPPY");
  const [protagonistName, setProtagonistName] = useState("");
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [generatingBookId, setGeneratingBookId] = useState(null);
  const [displayKeywords, setDisplayKeywords]   = useState([]);
  const [lemonTrigger, setLemonTrigger] = useState(0);
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 3, maxDaily: 3, usedToday: 0 });
  const intervalRef = useRef(null);

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!generatingBookId) return;

    intervalRef.current = setInterval(async () => {
      try {
        const res = await getBookGenerationStatus(generatingBookId);
        const status = res.data.status;
        if (status === "DONE") {
          clearInterval(intervalRef.current);
          navigate(`/book/${generatingBookId}`, { state: { fromGenerate: true } });
        } else if (status === "FAILED") {
          clearInterval(intervalRef.current);
          setError("책 생성에 실패했습니다. 잠시 후 다시 시도해주세요.");
          setLoading(false);
          setGeneratingBookId(null);
        }
      } catch (err) {
        // 폴링 중 네트워크 오류는 무시하고 계속 시도
      }
    }, 3000);

    return () => clearInterval(intervalRef.current);
  }, [generatingBookId, navigate]);

  const handleKeywordKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addKeyword();
    }
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim().replace(/,$/, "");
    if (!trimmed) return;
    if (keywords.length >= 4) {
      setError("키워드는 최대 4개까지 입력할 수 있어요.");
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
    if (trimmed && !allKeywords.includes(trimmed) && allKeywords.length < 4) {
      allKeywords.push(trimmed);
    }

    if (allKeywords.length === 0) {
      setError("키워드를 1개 이상 입력해주세요.");
      return;
    }

    setDisplayKeywords(allKeywords);
    setLemonTrigger((prev) => prev + 1);
    setLoading(true);

    const nameValue = protagonistName.trim() || null;

    try {
      const response = await generateBook({
        keywords: allKeywords,
        genre,
        tone,
        ending,
        protagonistName: nameValue,
      });
      // 생성 성공 시 레몬 정보 갱신
      getLemonInfo()
        .then((res) => setLemonInfo(res.data))
        .catch(() => {});
      const bookId = response.data.id;
      setGeneratingBookId(bookId);
    } catch (err) {
      const msg = err.response?.data?.error || "책 생성 요청에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setError(msg);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="generate-loading">
        <div className="generate-book-animation">
          <div className="generate-book-cover" />
          <div className="generate-book-page generate-page-1" />
          <div className="generate-book-page generate-page-2" />
          <div className="generate-book-page generate-page-3" />
        </div>
        <h2 className="generate-loading-title">Remon이 이야기를 쓰고 있어요</h2>
        <p className="generate-loading-sub">
          키워드: {displayKeywords.join(", ")}
        </p>
        <div className="generate-dots">
          <span /><span /><span />
        </div>
        <p className="generate-loading-hint">보통 10~60초 정도 걸려요. 페이지를 닫지 마세요.</p>
      </div>
    );
  }

  return (
    <div className="generate-container">
      <LemonFall trigger={lemonTrigger} />

      {/* 레몬트리 패널 */}
      <div className="generate-lemon-panel">
        <LemonTree lemonCount={lemonInfo.lemonCount} />
        <div className="generate-lemon-info">
          {lemonInfo.lemonCount > 0 ? (
            <>
              <p className="generate-lemon-count">
                보유 레몬 🍋 <strong>{lemonInfo.lemonCount}개</strong>
              </p>
              <p className="generate-lemon-used">
                오늘 {lemonInfo.usedToday}/{lemonInfo.maxDaily}회 사용
              </p>
            </>
          ) : (
            <>
              <p className="generate-lemon-empty">오늘 레몬이 없어요!</p>
              <p className="generate-lemon-empty-sub">내일 자정에 다시 충전됩니다 🌙</p>
            </>
          )}
        </div>
      </div>

      <div className="generate-header">
        <h1 className="generate-title">나만의 이야기 만들기</h1>
        <p className="generate-sub">키워드를 입력하면 Remon AI가 짧은 소설을 써드려요</p>
      </div>

      <form className="generate-form" onSubmit={handleSubmit}>

        {/* 키워드 */}
        <div className="generate-field">
          <label className="generate-label">
            키워드 <span className="generate-label-hint">최대 4개 · Enter로 추가</span>
          </label>
          <div className="keyword-input-wrap">
            {keywords.map((kw) => (
              <span key={kw} className="keyword-tag">
                {kw}
                <button type="button" className="keyword-tag-remove" onClick={() => removeKeyword(kw)}>×</button>
              </span>
            ))}
            {keywords.length < 4 && (
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

        {/* 분위기 */}
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

        {/* 결말 */}
        <div className="generate-field">
          <label className="generate-label">결말</label>
          <div className="chip-group">
            {ENDINGS.map((en) => (
              <button
                key={en.value}
                type="button"
                className={`chip ${ending === en.value ? "chip--active" : ""}`}
                onClick={() => setEnding(en.value)}
              >
                {en.label}
              </button>
            ))}
          </div>
        </div>

        {/* 주인공 이름 */}
        <div className="generate-field">
          <label className="generate-label">
            주인공 이름 <span className="generate-label-hint">선택사항 · 비워두면 AI가 결정</span>
          </label>
          <input
            type="text"
            className="generate-text-input"
            placeholder="예: 지우, 하늘, Alex"
            value={protagonistName}
            onChange={(e) => setProtagonistName(e.target.value)}
            maxLength={20}
          />
        </div>

        {error && <p className="generate-error">{error}</p>}

        <button
          type="submit"
          className="generate-submit-btn"
          disabled={lemonInfo.lemonCount <= 0}
        >
          이야기 만들기 ✨
        </button>
      </form>
    </div>
  );
};

export default GeneratePage;
