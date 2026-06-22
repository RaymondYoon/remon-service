import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateBook } from "../api/bookApi";
import { getLemonInfo } from "../api/userApi";
import { useBookGeneration } from "../context/BookGenerationContext";
import { useToast } from "../hooks/useToast";
import LemonTree from "../components/LemonTree";
import LemonFall from "../components/LemonFall";
import "./GeneratePage.css";

const GENRES  = ["SF", "판타지", "로맨스", "일상", "공포", "액션", "스릴러", "드라마", "느와르"];
const TONES = [
  { value: "WARM",       label: "따뜻한" },
  { value: "DARK",       label: "어두운" },
  { value: "HUMOROUS",   label: "유쾌한" },
  { value: "MYSTERIOUS", label: "신비로운" },
  { value: "MELANCHOLY", label: "쓸쓸한" },
  { value: "TENSE",      label: "긴장감 있는" },
  { value: "EPIC",       label: "웅장한" },
  { value: "BRUTAL",     label: "잔혹한" },
  { value: "DREAMY",     label: "몽환적인" },
  { value: "CYNICAL",    label: "냉소적인" },
];
const ENDINGS = [
  { value: "HAPPY", label: "해피엔딩" },
  { value: "SAD",   label: "새드엔딩" },
  { value: "OPEN",  label: "열린결말" },
];
const VIEWPOINTS = [
  { value: "3인칭", label: "3인칭 (전지적 시점)" },
  { value: "1인칭", label: "1인칭 (내가 주인공)" },
];
const PROTAGONIST_TRAITS = ["소심한", "까칠한", "비밀이 있는", "천재적인", "상처받은", "엉뚱한", "고집스러운", "순수한", "냉소적인", "외로운", "야망있는", "겁쟁이", "반항적인"];

const GeneratePage = () => {
  const navigate = useNavigate();
  const { startGeneration } = useBookGeneration();
  const showToast = useToast();

  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords]         = useState([]);
  const [genre, setGenre]               = useState(GENRES[0]);
  const [tones, setTones]               = useState(["WARM"]);
  const [ending, setEnding]             = useState("HAPPY");
  const [protagonistNames, setProtagonistNames] = useState([""]);
  const [characters, setCharacters]     = useState([]);
  const [synopsis, setSynopsis] = useState("");
  const [viewpoint, setViewpoint]             = useState("3인칭");
  const [protagonistTraits, setProtagonistTraits] = useState([]);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [lemonTrigger, setLemonTrigger] = useState(0);
  const [lemonInfo, setLemonInfo] = useState({ lemonCount: 3, maxDaily: 3, usedToday: 0 });

  useEffect(() => {
    getLemonInfo()
      .then((res) => setLemonInfo(res.data))
      .catch(() => {});
  }, []);

  const toggleTone = (value) => {
    if (tones.includes(value)) {
      if (tones.length > 1) setTones(tones.filter((t) => t !== value));
    } else {
      if (tones.length >= 2) { showToast("최대 2개까지 선택 가능해요", "error"); return; }
      setTones([...tones, value]);
    }
  };

  const toggleTrait = (trait) => {
    if (protagonistTraits.includes(trait)) {
      setProtagonistTraits(protagonistTraits.filter((t) => t !== trait));
    } else {
      if (protagonistTraits.length >= 3) { showToast("최대 3개까지 선택 가능해요", "error"); return; }
      setProtagonistTraits([...protagonistTraits, trait]);
    }
  };

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

    setLemonTrigger((prev) => prev + 1);
    setLoading(true);

    const validProtagonistNames = protagonistNames.map((n) => n.trim()).filter(Boolean);
    const validCharacters = characters.map((c) => c.trim()).filter(Boolean);

    try {
      const response = await generateBook({
        keywords: allKeywords,
        genre,
        tone: tones,
        ending,
        protagonistNames: validProtagonistNames.length > 0 ? validProtagonistNames : null,
        viewpoint,
        protagonistTrait: protagonistTraits.length > 0 ? protagonistTraits : null,
        synopsis: synopsis.trim() || null,
        characters: validCharacters.length > 0 ? validCharacters : null,
      });
      getLemonInfo()
        .then((res) => setLemonInfo(res.data))
        .catch(() => {});
      const bookId = response.data.id;
      startGeneration(bookId);
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.error || "책 생성 요청에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setError(msg);
      setLoading(false);
    }
  };

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
                placeholder={keywords.length === 0 ? "예: 우주, 고양이, 우주선 탈출 / 지우, 하늘, 까칠한 천재" : ""}
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
          <label className="generate-label">
            분위기 <span className="generate-label-hint">최대 2개 선택</span>
          </label>
          <div className="chip-group chip-group--multi">
            {TONES.map((t) => {
              const active = tones.includes(t.value);
              return (
                <button
                  key={t.value}
                  type="button"
                  className={`chip ${active ? "chip--active" : ""}`}
                  onClick={() => toggleTone(t.value)}
                >
                  {active && <span className="chip-check">✓ </span>}{t.label}
                </button>
              );
            })}
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
            주인공 이름 <span className="generate-label-hint">선택사항 · 최대 3명 · 비워두면 AI가 결정</span>
          </label>
          <div className="character-list">
            {protagonistNames.map((name, i) => (
              <div key={i} className="character-input-row">
                <input
                  type="text"
                  className="generate-text-input"
                  placeholder="예: 지우, 하늘, Alex"
                  value={name}
                  onChange={(e) => {
                    const next = [...protagonistNames];
                    next[i] = e.target.value;
                    setProtagonistNames(next);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  maxLength={20}
                />
                {protagonistNames.length > 1 && (
                  <button
                    type="button"
                    className="character-remove-btn"
                    onClick={() => setProtagonistNames(protagonistNames.filter((_, j) => j !== i))}
                  >×</button>
                )}
              </div>
            ))}
            {protagonistNames.length < 3 && (
              <button
                type="button"
                className="character-add-btn"
                onClick={() => setProtagonistNames([...protagonistNames, ""])}
              >+ 주인공 추가</button>
            )}
          </div>
        </div>

        {/* 한 줄 시놉시스 */}
        <div className="generate-field">
          <label className="generate-label">
            한 줄 시놉시스 <span className="generate-label-hint">선택사항 · 이야기의 방향을 직접 제시</span>
          </label>
          <textarea
            className="generate-synopsis-input"
            placeholder="예: 기억을 잃은 형사가 자신이 범인임을 깨닫는 이야기"
            value={synopsis}
            onChange={(e) => setSynopsis(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* 조연 등장인물 */}
        <div className="generate-field">
          <label className="generate-label">
            조연 등장인물 <span className="generate-label-hint">선택사항 · 최대 4명</span>
          </label>
          <div className="character-list">
            {characters.map((name, i) => (
              <div key={i} className="character-input-row">
                <input
                  type="text"
                  className="generate-text-input"
                  placeholder="조연 이름"
                  value={name}
                  onChange={(e) => {
                    const next = [...characters];
                    next[i] = e.target.value;
                    setCharacters(next);
                  }}
                  onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
                  maxLength={20}
                />
                <button
                  type="button"
                  className="character-remove-btn"
                  onClick={() => setCharacters(characters.filter((_, j) => j !== i))}
                >×</button>
              </div>
            ))}
            {characters.length < 4 && (
              <button
                type="button"
                className="character-add-btn"
                onClick={() => setCharacters([...characters, ""])}
              >+ 조연 추가</button>
            )}
          </div>
        </div>

        {/* 서술 시점 */}
        <div className="generate-field">
          <label className="generate-label">서술 시점</label>
          <div className="chip-group">
            {VIEWPOINTS.map((vp) => (
              <button
                key={vp.value}
                type="button"
                className={`chip ${viewpoint === vp.value ? "chip--active" : ""}`}
                onClick={() => setViewpoint(vp.value)}
              >
                {vp.label}
              </button>
            ))}
          </div>
        </div>

        {/* 주인공 성격 */}
        <div className="generate-field">
          <label className="generate-label">
            주인공 성격 <span className="generate-label-hint">선택사항 · 최대 3개 · 다시 누르면 해제</span>
          </label>
          <div className="chip-group chip-group--multi">
            {PROTAGONIST_TRAITS.map((trait) => {
              const active = protagonistTraits.includes(trait);
              return (
                <button
                  key={trait}
                  type="button"
                  className={`chip ${active ? "chip--active" : ""}`}
                  onClick={() => toggleTrait(trait)}
                >
                  {active && <span className="chip-check">✓ </span>}{trait}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="generate-error">{error}</p>}

        <button
          type="submit"
          className="generate-submit-btn"
          disabled={loading || lemonInfo.lemonCount <= 0}
        >
          {loading ? "요청 중..." : "이야기 만들기 ✨"}
        </button>
      </form>
    </div>
  );
};

export default GeneratePage;
